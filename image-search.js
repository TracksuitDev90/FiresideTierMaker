/* =====================================================
   Image Search Module – FiresideTierMaker
   Self-contained search overlay that lets users find
   images from the web and add them to the tier-maker tray.

   APIs used:
     • Wikimedia Commons  (default – free, no key needed)
     • Google Custom Search (optional – user provides key)
   ===================================================== */

(function () {
  'use strict';

  /* ---------- helpers (re-use app-level if available) ---------- */
  var qs  = function (s, c) { return (c || document).querySelector(s); };
  var qsa = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- state ---------- */
  var overlay, grid, input, statusEl, providerToggle, settingsPanel;
  var page       = 0;
  var query      = '';
  var loading    = false;
  var hasMore    = true;
  var selected   = {};         // src → true
  var provider   = 'wikimedia'; // 'wikimedia' | 'google'
  var GOOGLE_KEY = '';
  var GOOGLE_CX  = '';

  /* ---------- constants ---------- */
  var WIKI_BATCH = 40;
  var GOOG_BATCH = 10; // Google CSE limit

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
            '<button class="img-search-settings-btn" type="button" title="Search provider settings" aria-label="Settings">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655 1.113 2.706L4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098L18 20l2-2-1.484-1.736 1.105-2.659L22 13v-2l-2.378-.605Z"/></svg>' +
            '</button>' +
            '<button class="img-search-close" type="button" aria-label="Close">&times;</button>' +
          '</div>' +
          /* settings panel (collapsed by default) */
          '<div class="img-search-settings hidden">' +
            '<div class="img-search-provider-row">' +
              '<label class="img-search-radio-label">' +
                '<input type="radio" name="imgProvider" value="wikimedia" checked /> Wikimedia Commons <span class="provider-tag">Free · no key</span>' +
              '</label>' +
              '<label class="img-search-radio-label">' +
                '<input type="radio" name="imgProvider" value="google" /> Google Images <span class="provider-tag">API key required</span>' +
              '</label>' +
            '</div>' +
            '<div class="img-search-google-fields hidden">' +
              '<input class="img-search-input small" type="text" placeholder="Google API Key" autocomplete="off" />' +
              '<input class="img-search-input small" type="text" placeholder="Custom Search Engine ID (cx)" autocomplete="off" />' +
              '<button class="img-search-save-keys btn small" type="button">Save</button>' +
            '</div>' +
          '</div>' +
          /* search bar */
          '<div class="img-search-bar">' +
            '<input class="img-search-input" type="search" placeholder="Search for images…" autocomplete="off" />' +
            '<button class="img-search-go btn small" type="button">Search</button>' +
          '</div>' +
        '</div>' +
        '<div class="img-search-status"></div>' +
        '<div class="img-search-grid" role="list"></div>' +
        '<div class="img-search-footer">' +
          '<button class="img-search-more btn small" type="button" style="display:none">Load more</button>' +
          '<div class="img-search-sel-count"></div>' +
          '<button class="img-search-add btn small" type="button" disabled>Add selected <span class="img-search-add-count"></span></button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    /* cache refs */
    grid           = qs('.img-search-grid', overlay);
    input          = qs('.img-search-bar .img-search-input', overlay);
    statusEl       = qs('.img-search-status', overlay);
    settingsPanel  = qs('.img-search-settings', overlay);
    providerToggle = qs('.img-search-settings-btn', overlay);

    /* events */
    qs('.img-search-close', overlay).addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    qs('.img-search-go', overlay).addEventListener('click', function () { doSearch(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSearch(true); } });
    qs('.img-search-more', overlay).addEventListener('click', function () { doSearch(false); });
    qs('.img-search-add', overlay).addEventListener('click', addSelected);
    providerToggle.addEventListener('click', function () { settingsPanel.classList.toggle('hidden'); });

    /* provider radios */
    qsa('input[name="imgProvider"]', overlay).forEach(function (r) {
      r.addEventListener('change', function () {
        provider = r.value;
        var gf = qs('.img-search-google-fields', overlay);
        if (provider === 'google') gf.classList.remove('hidden');
        else gf.classList.add('hidden');
        try { localStorage.setItem('imgSearchProvider', provider); } catch (_) {}
      });
    });

    /* google key save */
    qs('.img-search-save-keys', overlay).addEventListener('click', function () {
      var inputs = qsa('.img-search-google-fields .img-search-input', overlay);
      GOOGLE_KEY = inputs[0].value.trim();
      GOOGLE_CX  = inputs[1].value.trim();
      try {
        localStorage.setItem('imgSearchGKey', GOOGLE_KEY);
        localStorage.setItem('imgSearchGCx', GOOGLE_CX);
      } catch (_) {}
      setStatus('Google API credentials saved.');
    });

    /* restore saved prefs */
    try {
      var sp = localStorage.getItem('imgSearchProvider');
      if (sp === 'google') {
        provider = 'google';
        qs('input[name="imgProvider"][value="google"]', overlay).checked = true;
        qs('.img-search-google-fields', overlay).classList.remove('hidden');
      }
      GOOGLE_KEY = localStorage.getItem('imgSearchGKey') || '';
      GOOGLE_CX  = localStorage.getItem('imgSearchGCx')  || '';
      var gInputs = qsa('.img-search-google-fields .img-search-input', overlay);
      gInputs[0].value = GOOGLE_KEY;
      gInputs[1].value = GOOGLE_CX;
    } catch (_) {}

    /* keyboard close */
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

  /* ---------- status ---------- */
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  /* ---------- search orchestrator ---------- */
  function doSearch(fresh) {
    var q = input.value.trim();
    if (!q) return;
    if (fresh) { page = 0; query = q; grid.innerHTML = ''; selected = {}; updateSelCount(); hasMore = true; }
    if (loading || !hasMore) return;
    loading = true;
    setStatus('Searching…');

    if (provider === 'google' && GOOGLE_KEY && GOOGLE_CX) {
      searchGoogle(query, page, function (err, results, more) {
        loading = false;
        if (err) { setStatus(err); return; }
        renderResults(results);
        hasMore = more;
        toggleMore(hasMore);
        page++;
        if (!results.length) setStatus('No results found.');
        else setStatus('');
      });
    } else {
      searchWikimedia(query, page, function (err, results, more) {
        loading = false;
        if (err) { setStatus(err); return; }
        renderResults(results);
        hasMore = more;
        toggleMore(hasMore);
        page++;
        if (!results.length && fresh) setStatus('No results found. Try different keywords.');
        else setStatus('');
      });
    }
  }

  /* ---------- Wikimedia Commons search ---------- */
  function searchWikimedia(q, pg, cb) {
    var offset = pg * WIKI_BATCH;
    var url = 'https://commons.wikimedia.org/w/api.php?' +
      'action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(q) +
      '&gsrlimit=' + WIKI_BATCH + '&gsroffset=' + offset +
      '&prop=imageinfo&iiprop=url|thumbmime&iiurlwidth=300' +
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
          // filter to actual images
          if (info.thumbmime && info.thumbmime.indexOf('image/') !== 0) return;
          results.push({
            thumb: info.thumburl || info.url,
            full: info.url,
            title: (p.title || '').replace('File:', '').replace(/\.\w+$/, '')
          });
        });
        var more = keys.length >= WIKI_BATCH;
        cb(null, results, more);
      })
      .catch(function (e) { cb('Network error – please try again.', [], false); });
  }

  /* ---------- Google Custom Search ---------- */
  function searchGoogle(q, pg, cb) {
    var start = pg * GOOG_BATCH + 1;
    var url = 'https://www.googleapis.com/customsearch/v1?' +
      'q=' + encodeURIComponent(q) +
      '&searchType=image&num=' + GOOG_BATCH +
      '&start=' + start +
      '&key=' + encodeURIComponent(GOOGLE_KEY) +
      '&cx=' + encodeURIComponent(GOOGLE_CX);

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { cb('Google API error: ' + (data.error.message || 'Unknown'), [], false); return; }
        var items = data.items || [];
        var results = items.map(function (it) {
          return {
            thumb: it.image && it.image.thumbnailLink ? it.image.thumbnailLink : it.link,
            full: it.link,
            title: it.title || ''
          };
        });
        var more = !!(data.queries && data.queries.nextPage);
        cb(null, results, more);
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
      card.dataset.title = r.title;

      var img = document.createElement('img');
      img.src = r.thumb;
      img.alt = r.title;
      img.loading = 'lazy';
      img.draggable = false;
      img.addEventListener('error', function () { card.classList.add('broken'); });
      card.appendChild(img);

      var check = document.createElement('span');
      check.className = 'img-search-check';
      check.innerHTML = '&#10003;';
      card.appendChild(check);

      card.addEventListener('click', function () { toggleSelect(card); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(card); } });
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

    var tray = typeof window.$ === 'function' ? window.$('#tray') : document.querySelector('#tray');
    if (!tray) return;

    srcs.forEach(function (src) {
      var info = selected[src];
      // Use the app's buildImageToken if available, else create a basic one
      if (typeof window.buildImageToken === 'function') {
        var token = window.buildImageToken(src, info.title || '');
        tray.insertBefore(token, tray.firstChild);
      } else {
        // fallback
        var token = document.createElement('div');
        token.className = 'token';
        token.setAttribute('data-custom', 'true');
        var img = document.createElement('img');
        img.src = src; img.alt = info.title || ''; img.draggable = false;
        token.appendChild(img);
        tray.insertBefore(token, tray.firstChild);
      }
    });

    // trigger save
    if (typeof window.scheduleSave === 'function') window.scheduleSave();

    setStatus(srcs.length + ' image' + (srcs.length > 1 ? 's' : '') + ' added!');
    selected = {};
    qsa('.img-search-card.selected', overlay).forEach(function (c) { c.classList.remove('selected'); });
    updateSelCount();

    // close after a brief delay so user sees the confirmation
    setTimeout(close, 600);
  }

  /* ---------- public API ---------- */
  window.ImageSearch = { open: open, close: close };
})();
