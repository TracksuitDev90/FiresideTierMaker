/* ---------- Token Tier Analytics ----------
 * Tracks token placements across sessions (localStorage only, no server).
 * Records snapshots when user explicitly saves, then shows trends
 * of where each token lands across different categories.
 */
(function(){
  'use strict';

  var ANALYTICS_KEY = 'tm_analytics';
  var MAX_SESSIONS  = 200; // cap stored sessions to avoid quota issues

  /* ---- Helpers ---- */
  var $ = function(s, ctx){ return (ctx||document).querySelector(s); };
  var $$ = function(s, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(s)); };

  /* ---- Data layer ---- */

  function loadAnalytics(){
    try {
      var json = localStorage.getItem(ANALYTICS_KEY);
      return json ? JSON.parse(json) : { sessions: [] };
    } catch(e){ return { sessions: [] }; }
  }

  function saveAnalytics(data){
    // Trim oldest if over cap
    while(data.sessions.length > MAX_SESSIONS) data.sessions.shift();
    try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data)); } catch(e){}
  }

  /* ---- Record a snapshot ---- */
  // Called when the user saves/finalizes a tier list.
  // Captures: category (title), tier order, and each token's placement.
  function recordSnapshot(){
    var titleEl = $('.board-title');
    var category = titleEl ? titleEl.textContent.trim() : '';
    if(!category) return false; // don't record untitled lists

    var rows = $$('.tier-row');
    if(!rows.length) return false;

    var tierOrder = [];
    var placements = [];

    rows.forEach(function(row, idx){
      var chip = row.querySelector('.label-chip');
      var drop = row.querySelector('.tier-drop');
      var tierLabel = chip ? chip.textContent.trim() : ('Tier ' + idx);
      tierOrder.push(tierLabel);

      $$('.token', drop).forEach(function(tok){
        var lbl = tok.querySelector('.label');
        var img = tok.querySelector('img');
        var name = lbl ? lbl.textContent.trim() : (img ? (img.alt || 'image') : null);
        if(!name) return;
        placements.push({
          name: name,
          tier: tierLabel,
          tierIndex: idx
        });
      });
    });

    if(!placements.length) return false;

    var data = loadAnalytics();

    // Deduplicate: don't record identical snapshots within 5 seconds
    var now = Date.now();
    var last = data.sessions[data.sessions.length - 1];
    if(last && (now - last.timestamp) < 5000 && last.category === category) return false;

    data.sessions.push({
      timestamp: now,
      category: category,
      tierOrder: tierOrder,
      tierCount: tierOrder.length,
      placements: placements
    });

    saveAnalytics(data);
    return true;
  }

  /* ---- Aggregate analytics ---- */

  // Returns: { tokenName: { total: N, tiers: { S: count, A: count, ... }, categories: { catName: { tier, tierIndex } }, avgRank: float, skew: 'high'|'mid'|'low' } }
  function aggregateAll(){
    var data = loadAnalytics();
    var map = {}; // tokenName -> stats

    data.sessions.forEach(function(session){
      var total = session.tierCount || session.tierOrder.length;

      session.placements.forEach(function(p){
        if(!map[p.name]) map[p.name] = { total: 0, tiers: {}, categories: {}, rankSum: 0 };
        var entry = map[p.name];
        entry.total++;
        entry.tiers[p.tier] = (entry.tiers[p.tier] || 0) + 1;

        // Normalized rank: 0 = top tier, 1 = bottom tier
        var normalized = total > 1 ? p.tierIndex / (total - 1) : 0;
        entry.rankSum += normalized;

        // Track per-category (keep most recent)
        if(!entry.categories[session.category]) entry.categories[session.category] = [];
        entry.categories[session.category].push({ tier: p.tier, tierIndex: p.tierIndex, time: session.timestamp });
      });
    });

    // Compute averages and skew
    Object.keys(map).forEach(function(name){
      var e = map[name];
      e.avgRank = e.total > 0 ? e.rankSum / e.total : 0.5;
      // Skew: top third = high, bottom third = low, else mid
      if(e.avgRank <= 0.33) e.skew = 'high';
      else if(e.avgRank >= 0.67) e.skew = 'low';
      else e.skew = 'mid';
    });

    return map;
  }

  // Aggregate for a specific category only
  function aggregateByCategory(category){
    var data = loadAnalytics();
    var map = {};

    data.sessions.forEach(function(session){
      if(session.category !== category) return;
      var total = session.tierCount || session.tierOrder.length;

      session.placements.forEach(function(p){
        if(!map[p.name]) map[p.name] = { total: 0, tiers: {}, rankSum: 0 };
        var entry = map[p.name];
        entry.total++;
        entry.tiers[p.tier] = (entry.tiers[p.tier] || 0) + 1;
        var normalized = total > 1 ? p.tierIndex / (total - 1) : 0;
        entry.rankSum += normalized;
      });
    });

    Object.keys(map).forEach(function(name){
      var e = map[name];
      e.avgRank = e.total > 0 ? e.rankSum / e.total : 0.5;
      if(e.avgRank <= 0.33) e.skew = 'high';
      else if(e.avgRank >= 0.67) e.skew = 'low';
      else e.skew = 'mid';
    });

    return map;
  }

  function getCategories(){
    var data = loadAnalytics();
    var cats = {};
    data.sessions.forEach(function(s){
      if(!cats[s.category]) cats[s.category] = 0;
      cats[s.category]++;
    });
    return cats;
  }

  function getSessionCount(){
    return loadAnalytics().sessions.length;
  }

  /* ---- UI: Analytics Panel ---- */

  function showAnalyticsPanel(){
    var stats = aggregateAll();
    var names = Object.keys(stats);
    var categories = getCategories();
    var catNames = Object.keys(categories);
    var sessionCount = getSessionCount();

    // Build overlay
    var overlay = document.createElement('div');
    overlay.className = 'analytics-overlay';

    var panel = document.createElement('div');
    panel.className = 'analytics-panel';

    // Header
    var header = document.createElement('div');
    header.className = 'analytics-header';

    var title = document.createElement('h2');
    title.className = 'analytics-title';
    title.textContent = 'Token Tier Analytics';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'analytics-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close analytics');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M18.3 5.71L12 12.01l-6.29-6.3-1.41 1.42L10.59 13.4l-6.3 6.3 1.42 1.41 6.29-6.29 6.29 6.29 1.41-1.41-6.3-6.3 6.3-6.29-1.41-1.42z" fill="currentColor"/></svg>';

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Summary
    var summary = document.createElement('div');
    summary.className = 'analytics-summary';
    summary.textContent = sessionCount + ' snapshot' + (sessionCount !== 1 ? 's' : '') + ' recorded across ' + catNames.length + ' categor' + (catNames.length !== 1 ? 'ies' : 'y');
    panel.appendChild(summary);

    if(!names.length){
      var empty = document.createElement('div');
      empty.className = 'analytics-empty';
      empty.innerHTML = '<p>No data yet!</p><p>Record snapshots by clicking the <strong>Record Snapshot</strong> button after placing tokens in tiers. Each snapshot captures where every token was placed.</p>';
      panel.appendChild(empty);
    } else {
      // Category filter
      if(catNames.length > 1){
        var filterRow = document.createElement('div');
        filterRow.className = 'analytics-filter';

        var filterLabel = document.createElement('span');
        filterLabel.className = 'analytics-filter-label';
        filterLabel.textContent = 'Filter: ';

        var filterSelect = document.createElement('select');
        filterSelect.className = 'analytics-select';
        var allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All categories (' + sessionCount + ')';
        filterSelect.appendChild(allOpt);
        catNames.sort().forEach(function(cat){
          var opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat + ' (' + categories[cat] + ')';
          filterSelect.appendChild(opt);
        });

        filterRow.appendChild(filterLabel);
        filterRow.appendChild(filterSelect);
        panel.appendChild(filterRow);
      }

      // Token list container
      var listWrap = document.createElement('div');
      listWrap.className = 'analytics-list';
      panel.appendChild(listWrap);

      function renderTokenList(filterCat){
        var currentStats = filterCat ? aggregateByCategory(filterCat) : stats;
        var sortedNames = Object.keys(currentStats).sort(function(a, b){
          return currentStats[a].avgRank - currentStats[b].avgRank;
        });

        listWrap.innerHTML = '';

        if(!sortedNames.length){
          var none = document.createElement('div');
          none.className = 'analytics-empty';
          none.textContent = 'No tokens recorded for this category.';
          listWrap.appendChild(none);
          return;
        }

        sortedNames.forEach(function(name){
          var s = currentStats[name];
          var card = document.createElement('div');
          card.className = 'analytics-token-card';

          // Token name + skew badge
          var nameRow = document.createElement('div');
          nameRow.className = 'analytics-name-row';

          var nameEl = document.createElement('span');
          nameEl.className = 'analytics-token-name';
          nameEl.textContent = name;

          var skewBadge = document.createElement('span');
          skewBadge.className = 'analytics-skew analytics-skew--' + s.skew;
          var skewText = s.skew === 'high' ? 'High Tier' : s.skew === 'low' ? 'Low Tier' : 'Mid Tier';
          skewBadge.textContent = skewText;

          var countBadge = document.createElement('span');
          countBadge.className = 'analytics-count';
          countBadge.textContent = s.total + 'x';

          nameRow.appendChild(nameEl);
          nameRow.appendChild(skewBadge);
          nameRow.appendChild(countBadge);
          card.appendChild(nameRow);

          // Tier distribution bar
          var barWrap = document.createElement('div');
          barWrap.className = 'analytics-bar-wrap';

          // Collect tier entries sorted by first appearance order
          var tierEntries = Object.keys(s.tiers).map(function(tier){
            return { tier: tier, count: s.tiers[tier] };
          });

          // Color palette for tiers
          var tierColors = {
            'S': '#ff6b6b', 'A': '#F2D04E', 'B': '#22c55e',
            'C': '#3b82f6', 'D': '#a78bfa', 'UNKNOWN': '#71717a'
          };
          var fallbackColors = ['#06b6d4','#e11d48','#16a34a','#f97316','#0ea5e9','#8b5cf6','#ec4899','#14b8a6'];
          var colorIdx = 0;

          tierEntries.forEach(function(te){
            var pct = (te.count / s.total) * 100;
            var seg = document.createElement('div');
            seg.className = 'analytics-bar-seg';
            seg.style.width = Math.max(pct, 3) + '%'; // min 3% for visibility
            var color = tierColors[te.tier] || fallbackColors[colorIdx++ % fallbackColors.length];
            seg.style.background = color;
            seg.title = te.tier + ': ' + te.count + ' (' + Math.round(pct) + '%)';

            var segLabel = document.createElement('span');
            segLabel.className = 'analytics-bar-label';
            segLabel.textContent = te.tier;
            // Use contrast color for readability
            var rgb = hexToRgbSimple(color);
            segLabel.style.color = (rgb.r*0.299 + rgb.g*0.587 + rgb.b*0.114) > 140 ? '#000' : '#fff';

            seg.appendChild(segLabel);
            barWrap.appendChild(seg);
          });

          card.appendChild(barWrap);

          // Tier breakdown text
          var breakdown = document.createElement('div');
          breakdown.className = 'analytics-breakdown';
          tierEntries.forEach(function(te){
            var pct = Math.round((te.count / s.total) * 100);
            var chip = document.createElement('span');
            chip.className = 'analytics-tier-chip';
            var color = tierColors[te.tier] || '#666';
            chip.style.borderColor = color;
            chip.textContent = te.tier + ': ' + te.count + ' (' + pct + '%)';
            breakdown.appendChild(chip);
          });
          card.appendChild(breakdown);

          listWrap.appendChild(card);
        });
      }

      renderTokenList('');

      // Filter listener
      if(catNames.length > 1){
        filterSelect.addEventListener('change', function(){
          renderTokenList(filterSelect.value);
        });
      }
    }

    // Footer with clear button
    var footer = document.createElement('div');
    footer.className = 'analytics-footer';

    var clearBtn = document.createElement('button');
    clearBtn.className = 'btn analytics-clear-btn';
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear All Data';
    footer.appendChild(clearBtn);
    panel.appendChild(footer);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Events
    function close(){ overlay.remove(); }
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e){
      if(e.key === 'Escape'){ close(); document.removeEventListener('keydown', onKey); }
    });

    clearBtn.addEventListener('click', function(){
      if(confirm('Clear all analytics data? This cannot be undone.')){
        try { localStorage.removeItem(ANALYTICS_KEY); } catch(e){}
        close();
      }
    });
  }

  function hexToRgbSimple(hex){
    var h = hex.replace('#','');
    if(h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  }

  /* ---- Toast feedback ---- */
  function showToast(msg, isError){
    var el = document.createElement('div');
    el.className = 'toast' + (isError ? ' toast-error' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.classList.add('toast-out'); }, 2200);
    setTimeout(function(){ el.remove(); }, 2600);
  }

  /* ---- Public API ---- */
  window.tokenAnalytics = {
    record: function(){
      var ok = recordSnapshot();
      if(ok) showToast('Snapshot recorded!');
      else showToast('Nothing to record (add a title and place tokens first)', true);
      return ok;
    },
    showPanel: showAnalyticsPanel,
    getData: loadAnalytics,
    getAggregate: aggregateAll,
    getAggregateByCategory: aggregateByCategory,
    getCategories: getCategories,
    getSessionCount: getSessionCount
  };

})();
