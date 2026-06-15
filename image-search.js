/* =====================================================
   Image Search Module – FiresideTierMaker
   Self-contained search overlay that lets users find
   images from the web and add them to the tier-maker tray.

   Relevance strategy (keyless, CORS-friendly):
     1. Wikipedia full-text search -> each matching article's
        REPRESENTATIVE lead image (prop=pageimages). This is the
        single most relevant picture for a subject, e.g. searching
        "overwatch tracer" surfaces the Tracer (Overwatch) article's
        hero art rather than random page icons. Ranked by search rank.
     2. The single best-matching article's own content images
        (filtered) for extra variety on the same subject.
     3. Wikimedia Commons full-text as a fill for real-world
        subjects (animals, food, places) that Commons covers well.
   Wiki lead images come first so the top of the grid is always the
   most on-topic; Commons noise (if any) sinks to the bottom.
   ===================================================== */

(function () {
  'use strict';

  var qs  = function (s, c) { return (c || document).querySelector(s); };
  var qsa = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var WIKI_API    = 'https://en.wikipedia.org/w/api.php';
  var COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

  /* ---------- state ---------- */
  var overlay, grid, input, statusEl;
  var _lastFocus = null;   // element to restore focus to on close
  var page       = 0;
  var query      = '';
  var loading    = false;
  var hasMore    = true;
  var selected   = {};   // src → {title}
  var seenKeys   = {};   // dedup across pages (by underlying file name)

  var BATCH = 40;

  /* ---------- filename noise filter ---------- */
  var NOISE_RE = /flag[\s_]of|icon[\s_]|logo[\s_]|commons[\s_-]logo|wikinews|wiktionary|wikisource|wikiquote|wikibooks|wikiversity|wikidata|wikivoyage|mediawiki|nuvola|crystal[\s_]clear|edit[\s_-]clear|ambox|padlock|question[\s_]book|text[\s_]document|disambig|stub[\s_]|map[\s_]of|locator[\s_]|blank[\s_]map|increase2?\.svg|decrease2?\.svg|steady2?\.svg|red[\s_]pog|symbol[\s_]|wiki[\s_]?letter|gnome-|oojs[\s_]ui|ic[\s_]/i;
  var EXT_OK = /\.(jpe?g|png|webp|gif)$/i;

  function isUseful(title, mime) {
    if (mime && mime.indexOf('image/') !== 0) return false;
    if (mime && mime.indexOf('image/svg') === 0) return false;
    // Require a recognised raster image extension — rejects svg/pdf/ogg/tif
    // and other non-token-friendly assets that slip through the mime check.
    if (!EXT_OK.test(title)) return false;
    if (NOISE_RE.test(title)) return false;
    return true;
  }

  /* Dedup key: the underlying Wikimedia file name, recovered from any
     thumb or full URL so the same picture pulled by two passes (at
     different sizes) collapses to one card. */
  function fileKey(url) {
    if (!url) return '';
    try {
      var afterThumb = url.split('/thumb/')[1];
      if (afterThumb) {
        var parts = afterThumb.split('/');
        // .../thumb/a/ab/Name.jpg/500px-Name.jpg  →  parts[2] = "Name.jpg"
        if (parts.length >= 3) return decodeURIComponent(parts[2]).toLowerCase();
      }
      var seg = url.split('/');
      return decodeURIComponent(seg[seg.length - 1]).toLowerCase();
    } catch (e) {
      return url.toLowerCase();
    }
  }

  /* ---------- tiny parallel runner (ES5, no Promise dependency) ---------- */
  function runParallel(tasks, done) {
    var results = new Array(tasks.length);
    var remaining = tasks.length;
    if (!remaining) { done([]); return; }
    tasks.forEach(function (task, i) {
      task(function (r) {
        results[i] = r;
        if (--remaining === 0) done(results);
      });
    });
  }

  /* ---------- build DOM ---------- */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'img-search-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image search');

    overlay.innerHTML =
      '<div class="img-search-modal">' +
        '<div class="img-search-header">' +
          '<div class="img-search-title-row">' +
            '<h3 class="img-search-title">Search Images</h3>' +
            '<button class="img-search-close" type="button" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="img-search-bar">' +
            '<input class="img-search-input" type="search" inputmode="search" enterkeyhint="search" placeholder="Games, characters, movies…" autocomplete="off" aria-label="Search for images" />' +
            '<button class="img-search-go" type="button">Search</button>' +
          '</div>' +
        '</div>' +
        '<div class="img-search-status" role="status" aria-live="polite"></div>' +
        '<div class="img-search-grid" role="list"></div>' +
        '<div class="img-search-footer">' +
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
    qs('.img-search-add', overlay).addEventListener('click', addSelected);

    /* infinite scroll */
    grid.addEventListener('scroll', function () {
      if (loading || !hasMore) return;
      var remaining = grid.scrollHeight - grid.scrollTop - grid.clientHeight;
      if (remaining < 240) doSearch(false);
    });

    document.addEventListener('keydown', function (e) {
      if (overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') trapTab(e);
    });
  }

  /* Keep keyboard focus inside the modal while it's open. */
  function trapTab(e) {
    var focusables = qsa(
      'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
      overlay
    ).filter(function (el) { return el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0];
    var last  = focusables[focusables.length - 1];
    var active = document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    else if (!overlay.contains(active)) { e.preventDefault(); first.focus(); }
  }

  /* ---------- open / close ---------- */
  function open() {
    if (!overlay) buildOverlay();
    _lastFocus = document.activeElement;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    // Return focus to whatever opened the modal
    if (_lastFocus && typeof _lastFocus.focus === 'function') {
      try { _lastFocus.focus(); } catch (e) {}
    }
    _lastFocus = null;
  }

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  /* ---------- search orchestrator ---------- */
  function doSearch(fresh) {
    var q = input.value.trim();
    if (!q) return;
    if (fresh) {
      page = 0; query = q; grid.innerHTML = ''; selected = {};
      seenKeys = {}; updateSelCount(); hasMore = true;
    }
    if (loading || !hasMore) return;
    loading = true;
    setStatus('Searching…');
    if (fresh) showSkeletons(); else showSpinner();

    var offset = page * BATCH;
    var tasks = [];

    // 1) Wikipedia representative lead images — highest relevance.
    tasks.push(function (done) {
      searchWikiLeadImages(query, offset, function (err, res, more) {
        done({ key: 'wiki', err: err, res: res || [], more: !!more });
      });
    });

    // 2) First page only: pull the top article's own images for variety.
    if (page === 0) {
      tasks.push(function (done) {
        searchTopArticleImages(query, function (err, res) {
          done({ key: 'article', err: err, res: res || [], more: false });
        });
      });
    }

    // 3) Commons full-text as a fill (real-world subjects).
    tasks.push(function (done) {
      searchCommons(query, page, function (err, res, more) {
        done({ key: 'commons', err: err, res: res || [], more: !!more });
      });
    });

    runParallel(tasks, function (out) {
      loading = false;
      removeSkeletons();
      removeSpinner();

      var byKey = {};
      out.forEach(function (o) { byKey[o.key] = o; });
      var wiki    = byKey.wiki    || { res: [], err: true,  more: false };
      var article = byKey.article || { res: [], err: false, more: false };
      var commons = byKey.commons || { res: [], err: true,  more: false };

      // Merge order defines visual priority: lead images, then the top
      // article's images, then Commons. dedup() drops cross-pass repeats.
      var merged = dedup([].concat(wiki.res, article.res, commons.res));

      var hadCardsBefore = !!grid.querySelector('.img-search-card');
      var allFailed = wiki.err && commons.err && !article.res.length;

      if (allFailed && !merged.length && !hadCardsBefore) {
        setStatus('Network error – please try again.');
        showEmptyState(query, true);
        hasMore = false;
        page++;
        return;
      }

      renderResults(merged);
      hasMore = wiki.more || commons.more;
      page++;

      var hasCards = !!grid.querySelector('.img-search-card');
      if (!hasCards) {
        setStatus('');
        showEmptyState(query, false);
      } else if (!hasMore && !merged.length) {
        setStatus('No more results.');
      } else {
        setStatus('');
      }
    });
  }

  function dedup(results) {
    var out = [];
    results.forEach(function (r) {
      var key = fileKey(r.full || r.thumb);
      if (!key || seenKeys[key]) return;
      seenKeys[key] = true;
      out.push(r);
    });
    return out;
  }

  /* ---------- 1) Wikipedia representative lead images ----------
     generator=search finds articles matching the query; prop=pageimages
     returns each article's single representative picture (the PageImages
     extension's pick, normally the infobox/lead image). Results are
     ordered by the search rank carried in each page's `index`. */
  function searchWikiLeadImages(q, offset, cb) {
    var url = WIKI_API + '?action=query' +
      '&generator=search' +
      '&gsrsearch=' + encodeURIComponent(q) +
      '&gsrnamespace=0' +
      '&gsrlimit=' + BATCH +
      '&gsroffset=' + offset +
      '&prop=pageimages' +
      '&piprop=thumbnail' +
      '&pithumbsize=500' +
      '&pilimit=' + BATCH +
      '&format=json&origin=*';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.query || !data.query.pages) { cb(null, [], false); return; }
        var pages = data.query.pages;
        var out = [];
        Object.keys(pages).forEach(function (k) {
          var p = pages[k];
          if (!p.thumbnail || !p.thumbnail.source) return;
          // Drop obvious junk lead images (country flags, logos, icons).
          if (p.pageimage && NOISE_RE.test(p.pageimage)) return;
          out.push({
            thumb: p.thumbnail.source,
            full:  p.thumbnail.source,
            title: p.title || '',
            index: typeof p.index === 'number' ? p.index : 999
          });
        });
        out.sort(function (a, b) { return a.index - b.index; });
        cb(null, out, !!data.continue);
      })
      .catch(function () { cb(true, [], false); });
  }

  /* ---------- 2) Top-matching article's own images ----------
     Resolves the single best article for the query, then pulls the
     images embedded in it (filtered) so a focused search like
     "Tracer (Overwatch)" yields several on-topic pictures. */
  function searchTopArticleImages(q, cb) {
    var sUrl = WIKI_API + '?action=query&list=search' +
      '&srsearch=' + encodeURIComponent(q) +
      '&srnamespace=0&srlimit=1&format=json&origin=*';

    fetch(sUrl)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var hits = d.query && d.query.search;
        if (!hits || !hits.length) { cb(null, []); return; }
        var title = hits[0].title;
        var iUrl = WIKI_API + '?action=query' +
          '&titles=' + encodeURIComponent(title) +
          '&generator=images&gimlimit=40' +
          '&prop=imageinfo&iiprop=url|thumbmime&iiurlwidth=500' +
          '&format=json&origin=*';

        fetch(iUrl)
          .then(function (r2) { return r2.json(); })
          .then(function (d2) {
            var pages = d2.query && d2.query.pages;
            if (!pages) { cb(null, []); return; }
            var out = [];
            Object.keys(pages).forEach(function (k) {
              var p = pages[k];
              if (!p.imageinfo || !p.imageinfo.length) return;
              var info = p.imageinfo[0];
              if (!isUseful(p.title || '', info.thumbmime)) return;
              out.push({
                thumb: info.thumburl || info.url,
                full:  info.url,
                title: (p.title || '').replace('File:', '').replace(/\.\w+$/, '')
              });
            });
            cb(null, out);
          })
          .catch(function () { cb(true, []); });
      })
      .catch(function () { cb(true, []); });
  }

  /* ---------- 3) Wikimedia Commons fill ---------- */
  function searchCommons(q, pg, cb) {
    var offset = pg * BATCH;
    var url = COMMONS_API + '?action=query' +
      '&generator=search&gsrnamespace=6' +
      '&gsrsearch=' + encodeURIComponent(q) +
      '&gsrlimit=' + BATCH + '&gsroffset=' + offset +
      '&prop=imageinfo&iiprop=url|thumbmime&iiurlwidth=500' +
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
            full:  info.url,
            title: (p.title || '').replace('File:', '').replace(/\.\w+$/, '')
          });
        });
        cb(null, results, !!data.continue || keys.length >= BATCH);
      })
      .catch(function () { cb('Network error – please try again.', [], false); });
  }

  /* ---------- render ---------- */
  function renderResults(results) {
    results.forEach(function (r) {
      var card = document.createElement('div');
      card.className = 'img-search-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.dataset.full  = r.full;
      card.dataset.thumb = r.thumb || r.full;
      card.dataset.title = r.title;

      var img = document.createElement('img');
      img.src = r.thumb;
      img.alt = r.title;
      img.loading = 'lazy';
      img.draggable = false;
      img.addEventListener('error', function () {
        // Drop broken results entirely rather than leaving dim empty holes
        // in the grid; clear selection if it had been picked.
        if (selected[card.dataset.full]) { delete selected[card.dataset.full]; updateSelCount(); }
        card.remove();
      });
      card.appendChild(img);

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
      card.setAttribute('aria-selected', 'false');
    } else {
      selected[src] = { title: card.dataset.title, thumb: card.dataset.thumb };
      card.classList.add('selected');
      card.setAttribute('aria-selected', 'true');
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

  function showSpinner() {
    removeSpinner();
    var el = document.createElement('div');
    el.className = 'img-search-loading';
    el.innerHTML = '<div class="img-search-spinner"></div>';
    grid.appendChild(el);
  }
  function removeSpinner() {
    var s = qs('.img-search-loading', grid);
    if (s) s.remove();
  }
  function showSkeletons() {
    removeSkeletons();
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('div');
      s.className = 'img-search-skel';
      grid.appendChild(s);
    }
  }
  function removeSkeletons() {
    qsa('.img-search-skel', grid).forEach(function (s) { s.remove(); });
  }
  function showEmptyState(q, isError) {
    var wrap = document.createElement('div');
    wrap.className = 'img-search-empty';
    var safeQ = String(q).replace(/[<>&]/g, function (c) {
      return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;';
    });
    wrap.innerHTML =
      '<div class="img-search-empty-icon">' + (isError ? '!' : '?') + '</div>' +
      '<h4 class="img-search-empty-title">' +
        (isError ? 'Something went wrong' : 'No matches for “' + safeQ + '”') +
      '</h4>' +
      '<p class="img-search-empty-sub">' +
        (isError ? 'Check your connection and try again.' : 'Try a different spelling, a related term, or a broader query.') +
      '</p>';
    grid.appendChild(wrap);
  }

  /* ---------- add selected images to tray ---------- */
  function addSelected() {
    var srcs = Object.keys(selected);
    if (!srcs.length) return;

    var tray = document.querySelector('#tray');
    if (!tray) return;

    function addToken(finalSrc, info) {
      if (typeof window.buildImageToken === 'function') {
        var token = window.buildImageToken(finalSrc, info.title || '');
        tray.insertBefore(token, tray.firstChild);
      } else {
        var token = document.createElement('div');
        token.className = 'token';
        token.setAttribute('data-custom', 'true');
        var img = document.createElement('img');
        img.src = finalSrc; img.alt = info.title || ''; img.draggable = false;
        token.appendChild(img);
        tray.insertBefore(token, tray.firstChild);
      }
      if (typeof window.scheduleSave === 'function') window.scheduleSave();
    }

    srcs.forEach(function (src) {
      var info = selected[src];
      // Inline the 500px thumbnail (plenty for a ~99px token, far smaller than
      // full-res) so it persists + exports cleanly; fall back to the raw URL.
      var toInline = info.thumb || src;
      if (typeof window.inlineImageSrc === 'function') {
        window.inlineImageSrc(toInline, function (finalSrc) { addToken(finalSrc, info); });
      } else {
        addToken(toInline, info);
      }
    });

    setStatus(srcs.length + ' image' + (srcs.length > 1 ? 's' : '') + ' added!');
    selected = {};
    qsa('.img-search-card.selected', overlay).forEach(function (c) { c.classList.remove('selected'); });
    updateSelCount();

    setTimeout(close, 600);
  }

  /* ---------- public API ---------- */
  window.ImageSearch = { open: open, close: close };
})();
