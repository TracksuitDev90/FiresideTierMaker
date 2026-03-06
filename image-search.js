/* =====================================================
   Image Search Module – FiresideTierMaker
   Self-contained search overlay that lets users find
   images from the web and add them to the tier-maker tray.

   Uses a two-pass Wikipedia + Wikimedia Commons strategy
   for relevant, high-quality image results.
   ===================================================== */

(function () {
  'use strict';

  var qs  = function (s, c) { return (c || document).querySelector(s); };
  var qsa = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- state ---------- */
  var overlay, grid, input, statusEl;
  var page       = 0;
  var query      = '';
  var loading    = false;
  var hasMore    = true;
  var selected   = {};   // src → {title}
  var seenUrls   = {};   // dedup across pages

  var BATCH = 40;

  /* ---------- filename noise filter ---------- */
  var NOISE_RE = /flag[\s_]of|icon[\s_]|logo[\s_]|commons[\s_-]logo|wikinews|wiktionary|wikisource|wikiquote|wikibooks|wikiversity|wikidata|wikivoyage|mediawiki|nuvola|crystal[\s_]clear|edit[\s_-]clear|ambox|padlock|question[\s_]book|text[\s_]document|disambig|stub[\s_]|map[\s_]of|locator[\s_]|blank[\s_]map|increase2?\.svg|decrease2?\.svg|steady2?\.svg/i;
  var EXT_OK = /\.(jpe?g|png|webp|gif)$/i;

  function isUseful(title, mime) {
    if (mime && mime.indexOf('image/') !== 0) return false;
    if (mime && mime.indexOf('image/svg') === 0) return false;
    if (!EXT_OK.test(title) && mime && mime.indexOf('image/svg') === 0) return false;
    if (NOISE_RE.test(title)) return false;
    return true;
  }

  /* ---------- build DOM ---------- */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'img-search-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Image search');

    overlay.innerHTML =
      '<div class="img-search-modal">' +
        '<div class="img-search-header">' +
          '<div class="img-search-title-row">' +
            '<h3 class="img-search-title">Search Images</h3>' +
            '<button class="img-search-close" type="button" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="img-search-bar">' +
            '<input class="img-search-input" type="search" placeholder="Search for images\u2026" autocomplete="off" />' +
            '<button class="img-search-go" type="button">Search</button>' +
          '</div>' +
        '</div>' +
        '<div class="img-search-status"></div>' +
        '<div class="img-search-grid" role="list"></div>' +
        '<div class="img-search-footer">' +
          '<button class="img-search-more" type="button" style="display:none">Load more</button>' +
          '<div class="img-search-sel-count"></div>' +
          '<button class="img-search-add" type="button" disabled>Add selected <span class="img-search-add-count"></span></button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    grid     = qs('.img-search-grid', overlay);
    input    = qs('.img-search-bar .img-search-input', overlay);
    statusEl = qs('.img-search-status', overlay);

    qs('.img-search-close', overlay).addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    qs('.img-search-go', overlay).addEventListener('click', function () { doSearch(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSearch(true); } });
    qs('.img-search-more', overlay).addEventListener('click', function () { doSearch(false); });
    qs('.img-search-add', overlay).addEventListener('click', addSelected);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
    });
  }

  /* ---------- open / close ---------- */
  function open() {
    if (!overlay) buildOverlay();
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  /* ---------- search orchestrator ---------- */
  function doSearch(fresh) {
    var q = input.value.trim();
    if (!q) return;
    if (fresh) {
      page = 0; query = q; grid.innerHTML = ''; selected = {};
      seenUrls = {}; updateSelCount(); hasMore = true;
    }
    if (loading || !hasMore) return;
    loading = true;
    setStatus('Searching\u2026');

    /* First page: try Wikipedia article images for best relevance,
       then fill remaining slots with Commons search.
       Subsequent pages: Commons search only. */
    if (page === 0) {
      searchWikipediaImages(query, function (wikiResults) {
        searchCommons(query, 0, function (err, commonsResults, more) {
          loading = false;
          if (err && !wikiResults.length) { setStatus(err); return; }
          // Merge: wiki results first (higher relevance), then commons
          var merged = dedup(wikiResults.concat(commonsResults));
          renderResults(merged);
          hasMore = more;
          toggleMore(hasMore);
          page++;
          if (!merged.length) setStatus('No results found. Try different keywords.');
          else setStatus('');
        });
      });
    } else {
      searchCommons(query, page, function (err, results, more) {
        loading = false;
        if (err) { setStatus(err); return; }
        var unique = dedup(results);
        renderResults(unique);
        hasMore = more;
        toggleMore(hasMore);
        page++;
        if (!unique.length && !more) setStatus('No more results.');
        else setStatus('');
      });
    }
  }

  function dedup(results) {
    var out = [];
    results.forEach(function (r) {
      if (seenUrls[r.full]) return;
      seenUrls[r.full] = true;
      out.push(r);
    });
    return out;
  }

  /* ---------- Wikipedia article image search ---------- */
  /* Searches Wikipedia for articles matching the query, then pulls
     the images used on those pages. This gives much more relevant
     results for things like "Harry Potter" or "Overwatch characters". */
  function searchWikipediaImages(q, cb) {
    var url = 'https://en.wikipedia.org/w/api.php?' +
      'action=query&generator=search&gsrsearch=' + encodeURIComponent(q) +
      '&gsrlimit=5&prop=images&imlimit=50&format=json&origin=*';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.query || !data.query.pages) { cb([]); return; }
        var pages = data.query.pages;
        // Collect all image filenames from the article pages
        var filenames = [];
        Object.keys(pages).forEach(function (k) {
          var imgs = pages[k].images || [];
          imgs.forEach(function (im) {
            var t = im.title || '';
            if (isUseful(t, null)) filenames.push(t);
          });
        });
        if (!filenames.length) { cb([]); return; }

        // Now fetch actual image URLs for those filenames (batch of up to 50)
        var titles = filenames.slice(0, 50).join('|');
        var infoUrl = 'https://en.wikipedia.org/w/api.php?' +
          'action=query&titles=' + encodeURIComponent(titles) +
          '&prop=imageinfo&iiprop=url|thumbmime&iiurlwidth=300' +
          '&format=json&origin=*';

        fetch(infoUrl)
          .then(function (r2) { return r2.json(); })
          .then(function (d2) {
            if (!d2.query || !d2.query.pages) { cb([]); return; }
            var results = [];
            Object.keys(d2.query.pages).forEach(function (k) {
              var p = d2.query.pages[k];
              if (!p.imageinfo || !p.imageinfo.length) return;
              var info = p.imageinfo[0];
              if (!isUseful(p.title || '', info.thumbmime)) return;
              results.push({
                thumb: info.thumburl || info.url,
                full: info.url,
                title: (p.title || '').replace('File:', '').replace(/\.\w+$/, '')
              });
            });
            cb(results);
          })
          .catch(function () { cb([]); });
      })
      .catch(function () { cb([]); });
  }

  /* ---------- Wikimedia Commons search ---------- */
  function searchCommons(q, pg, cb) {
    var offset = pg * BATCH;
    var url = 'https://commons.wikimedia.org/w/api.php?' +
      'action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(q) +
      '&gsrlimit=' + BATCH + '&gsroffset=' + offset +
      '&prop=imageinfo&iiprop=url|thumbmime|extmetadata&iiurlwidth=300' +
      '&format=json&origin=*';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.query || !data.query.pages) { cb(null, [], false); return; }
        var pages = data.query.pages;
        var keys = Object.keys(pages);
        var results = [];
        keys.forEach(function (k) {
          var p = pages[k];
          if (!p.imageinfo || !p.imageinfo.length) return;
          var info = p.imageinfo[0];
          if (!isUseful(p.title || '', info.thumbmime)) return;
          results.push({
            thumb: info.thumburl || info.url,
            full: info.url,
            title: (p.title || '').replace('File:', '').replace(/\.\w+$/, '')
          });
        });
        cb(null, results, keys.length >= BATCH);
      })
      .catch(function () { cb('Network error \u2013 please try again.', [], false); });
  }

  /* ---------- render ---------- */
  function renderResults(results) {
    results.forEach(function (r) {
      var card = document.createElement('div');
      card.className = 'img-search-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.dataset.full  = r.full;
      card.dataset.title = r.title;

      var img = document.createElement('img');
      img.src = r.thumb;
      img.alt = r.title;
      img.loading = 'lazy';
      img.draggable = false;
      img.addEventListener('error', function () { card.classList.add('broken'); });
      card.appendChild(img);

      var label = document.createElement('span');
      label.className = 'img-search-label';
      label.textContent = r.title.length > 40 ? r.title.slice(0, 38) + '\u2026' : r.title;
      card.appendChild(label);

      var check = document.createElement('span');
      check.className = 'img-search-check';
      check.innerHTML = '&#10003;';
      card.appendChild(check);

      card.addEventListener('click', function () { toggleSelect(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(card); }
      });
      grid.appendChild(card);
    });
  }

  /* ---------- selection ---------- */
  function toggleSelect(card) {
    var src = card.dataset.full;
    if (selected[src]) {
      delete selected[src];
      card.classList.remove('selected');
    } else {
      selected[src] = { title: card.dataset.title };
      card.classList.add('selected');
    }
    updateSelCount();
  }

  function updateSelCount() {
    var n = Object.keys(selected).length;
    var countEl  = qs('.img-search-sel-count', overlay);
    var addBtn   = qs('.img-search-add', overlay);
    var addCount = qs('.img-search-add-count', overlay);
    if (countEl) countEl.textContent = n ? n + ' selected' : '';
    if (addBtn)  addBtn.disabled = n === 0;
    if (addCount) addCount.textContent = n ? '(' + n + ')' : '';
  }

  function toggleMore(show) {
    var btn = qs('.img-search-more', overlay);
    if (btn) btn.style.display = show ? '' : 'none';
  }

  /* ---------- add selected images to tray ---------- */
  function addSelected() {
    var srcs = Object.keys(selected);
    if (!srcs.length) return;

    var tray = document.querySelector('#tray');
    if (!tray) return;

    srcs.forEach(function (src) {
      var info = selected[src];
      if (typeof window.buildImageToken === 'function') {
        var token = window.buildImageToken(src, info.title || '');
        tray.insertBefore(token, tray.firstChild);
      } else {
        var token = document.createElement('div');
        token.className = 'token';
        token.setAttribute('data-custom', 'true');
        var img = document.createElement('img');
        img.src = src; img.alt = info.title || ''; img.draggable = false;
        token.appendChild(img);
        tray.insertBefore(token, tray.firstChild);
      }
    });

    if (typeof window.scheduleSave === 'function') window.scheduleSave();

    setStatus(srcs.length + ' image' + (srcs.length > 1 ? 's' : '') + ' added!');
    selected = {};
    qsa('.img-search-card.selected', overlay).forEach(function (c) { c.classList.remove('selected'); });
    updateSelCount();

    setTimeout(close, 600);
  }

  /* ---------- public API ---------- */
  window.ImageSearch = { open: open, close: close };
})();
