/* ========== Quadrant Chart Mode ========== */
/* Separate file from the tier maker — linked together via shared globals */

(function(){
  'use strict';

  /* ---------- Shared refs (from script.js) ---------- */
  // These globals are defined in script.js and available here:
  // $, $$, uid, on, isSmall, vib, live, cssVar, darken, lighten, hexToRgb, rgbToHex,
  // mixHex, relativeLuminance, colorPickDotColor, measureText,
  // buildNameToken, buildImageToken, pickTextColor, fitLiveLabel,
  // scheduleSave, tray, flipZones, ensureId, recordPlacement, recordDeletion,
  // historyStack, _supportsPassive, debounce

  var QUADRANT_STORAGE_KEY = 'tm_quadrant';

  /* ---------- State ---------- */
  var currentMode = 'tier'; // 'tier' or 'quadrant'
  var qBoard = null;        // #quadrantBoard element
  var qZones = [];          // the four .q-zone elements [tl, tr, bl, br]
  var qAxisLabels = {};     // {top, bottom, left, right} contenteditable elements

  /* Default quadrant colors */
  var Q_DEFAULTS = {
    tl: { bg: 'rgba(239,68,68,.12)', solid: '#ef4444' },
    tr: { bg: 'rgba(34,197,94,.12)',  solid: '#22c55e' },
    bl: { bg: 'rgba(251,191,36,.12)', solid: '#fbbf24' },
    br: { bg: 'rgba(59,130,246,.12)', solid: '#3b82f6' }
  };

  var Q_POSITIONS = ['tl','tr','bl','br'];

  /* Default axis labels */
  var DEFAULT_LABELS = {
    top: 'HIGH',
    bottom: 'LOW',
    left: 'LOW',
    right: 'HIGH'
  };

  /* ---------- Token size for quadrant (matches CSS) ---------- */
  function qTokenSize(){
    if(window.matchMedia && window.matchMedia('(max-width:480px)').matches) return 48;
    if(isSmall()) return 55;
    return 65;
  }

  /* ---------- Build quadrant DOM ---------- */
  function buildQuadrantBoard(){
    var outer = document.createElement('div');
    outer.className = 'q-outer';

    // Top axis label
    var topLabel = document.createElement('div');
    topLabel.className = 'q-axis-label q-top-label';
    topLabel.setAttribute('contenteditable','true');
    topLabel.setAttribute('spellcheck','false');
    topLabel.setAttribute('data-placeholder','Label...');
    topLabel.textContent = DEFAULT_LABELS.top;
    outer.appendChild(topLabel);
    qAxisLabels.top = topLabel;

    // Left axis label
    var leftWrap = document.createElement('div');
    leftWrap.className = 'q-labels-col';
    var leftLabel = document.createElement('div');
    leftLabel.className = 'q-axis-label';
    leftLabel.setAttribute('contenteditable','true');
    leftLabel.setAttribute('spellcheck','false');
    leftLabel.setAttribute('data-placeholder','Label...');
    leftLabel.textContent = DEFAULT_LABELS.left;
    leftWrap.appendChild(leftLabel);
    leftWrap.style.gridColumn = '1';
    leftWrap.style.gridRow = '2';
    leftWrap.style.alignSelf = 'center';
    leftWrap.style.paddingRight = '6px';
    outer.appendChild(leftWrap);
    qAxisLabels.left = leftLabel;

    // Grid wrap (the 2x2 chart)
    var gridWrap = document.createElement('div');
    gridWrap.className = 'q-grid-wrap';

    var positions = Q_POSITIONS;
    var labels = ['Top Left','Top Right','Bottom Left','Bottom Right'];
    qZones = [];

    for(var i=0;i<4;i++){
      var zone = document.createElement('div');
      zone.className = 'q-zone q-zone--'+positions[i]+' dropzone';
      zone.id = 'qzone-'+positions[i];
      zone.setAttribute('role','list');
      zone.setAttribute('tabindex','0');

      // Corner label
      var zLabel = document.createElement('span');
      zLabel.className = 'q-zone-label';
      zLabel.textContent = labels[i];
      zone.appendChild(zLabel);

      // Color picker
      var colorPick = document.createElement('label');
      colorPick.className = 'q-color-pick';
      colorPick.setAttribute('aria-label','Change quadrant color');
      var colorDot = document.createElement('span');
      colorDot.className = 'q-color-dot';
      colorDot.style.background = colorPickDotColor(Q_DEFAULTS[positions[i]].solid);
      colorPick.appendChild(colorDot);
      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'q-color-input';
      colorInput.value = Q_DEFAULTS[positions[i]].solid;
      colorInput.setAttribute('tabindex','-1');
      colorInput.setAttribute('aria-hidden','true');
      colorPick.appendChild(colorInput);
      zone.appendChild(colorPick);

      // Wire color picker
      (function(z, ci, cd, pos){
        on(ci,'input',function(){
          applyQZoneColor(z, ci.value, pos);
          cd.style.background = colorPickDotColor(ci.value);
          scheduleQuadrantSave();
        });
        on(ci,'change',function(){
          applyQZoneColor(z, ci.value, pos);
          cd.style.background = colorPickDotColor(ci.value);
          scheduleQuadrantSave();
        });
      })(zone, colorInput, colorDot, positions[i]);

      gridWrap.appendChild(zone);
      qZones.push(zone);

      // Enable drop on this zone
      enableQuadrantDrop(zone);
    }

    outer.appendChild(gridWrap);

    // Right axis label
    var rightWrap = document.createElement('div');
    rightWrap.className = 'q-labels-col-right';
    var rightLabel = document.createElement('div');
    rightLabel.className = 'q-axis-label';
    rightLabel.setAttribute('contenteditable','true');
    rightLabel.setAttribute('spellcheck','false');
    rightLabel.setAttribute('data-placeholder','Label...');
    rightLabel.textContent = DEFAULT_LABELS.right;
    rightWrap.appendChild(rightLabel);
    rightWrap.style.gridColumn = '3';
    rightWrap.style.gridRow = '2';
    rightWrap.style.alignSelf = 'center';
    rightWrap.style.paddingLeft = '6px';
    outer.appendChild(rightWrap);
    qAxisLabels.right = rightLabel;

    // Bottom axis label
    var bottomLabel = document.createElement('div');
    bottomLabel.className = 'q-axis-label q-bottom-label';
    bottomLabel.setAttribute('contenteditable','true');
    bottomLabel.setAttribute('spellcheck','false');
    bottomLabel.setAttribute('data-placeholder','Label...');
    bottomLabel.textContent = DEFAULT_LABELS.bottom;
    outer.appendChild(bottomLabel);
    qAxisLabels.bottom = bottomLabel;

    // Wire axis label saves
    ['top','bottom','left','right'].forEach(function(dir){
      on(qAxisLabels[dir],'input', scheduleQuadrantSave);
      on(qAxisLabels[dir],'keydown',function(e){
        if(e.key==='Enter'){e.preventDefault();qAxisLabels[dir].blur();}
      });
    });

    return outer;
  }

  /* Apply custom color to a quadrant zone */
  function applyQZoneColor(zone, hexColor, pos){
    var dark = document.documentElement.getAttribute('data-theme')!=='light';
    var alpha = dark ? 0.14 : 0.09;
    var rgb = hexToRgb(hexColor);
    zone.style.background = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+alpha+')';
    zone.dataset.customColor = hexColor;
  }

  /* ---------- Free-placement drag within quadrant zones ---------- */
  function enableQuadrantDrop(zone){
    // Click-to-place: if a token is selected, place it at click position
    on(zone,'click',function(e){
      if(e.target.closest('.token')) return;
      var selected = $('.token.selected');
      if(!selected) return;

      // If token is already in a q-zone, update its position
      if(selected.closest('.q-zone') === zone){
        var rect = zone.getBoundingClientRect();
        var sz = qTokenSize();
        var x = e.clientX - rect.left - sz/2;
        var y = e.clientY - rect.top - sz/2;
        x = Math.max(0, Math.min(x, rect.width - sz));
        y = Math.max(0, Math.min(y, rect.height - sz));
        selected.style.left = (x/rect.width*100)+'%';
        selected.style.top = (y/rect.height*100)+'%';
        selected.classList.remove('selected');
        scheduleQuadrantSave();
        return;
      }

      // Move from tray or another zone into this zone
      var fromId = ensureId(selected.parentElement,'zone');
      var originNext = selected.nextElementSibling;
      var originBeforeId = originNext ? ensureId(originNext,'tok') : '';
      var origin = selected.parentElement;

      var rect2 = zone.getBoundingClientRect();
      var sz2 = qTokenSize();
      var nx = e.clientX - rect2.left - sz2/2;
      var ny = e.clientY - rect2.top - sz2/2;
      nx = Math.max(0, Math.min(nx, rect2.width - sz2));
      ny = Math.max(0, Math.min(ny, rect2.height - sz2));

      // If coming from tray, use flipZones for smooth tray animation
      if(origin.id === 'tray'){
        flipZones([origin], function(){
          zone.appendChild(selected);
        });
      } else {
        zone.appendChild(selected);
      }
      selected.style.position = 'absolute';
      selected.style.left = (nx/rect2.width*100)+'%';
      selected.style.top = (ny/rect2.height*100)+'%';
      selected.classList.remove('selected');

      recordPlacement(selected.id, fromId, zone.id, originBeforeId);
      live('Placed "'+(selected.innerText||'item')+'" on quadrant chart');
      vib(6);
      scheduleQuadrantSave();
    });
  }

  /* ---------- Pointer drag for tokens within quadrant ---------- */
  function enableQuadrantTokenDrag(token){
    // This is called in addition to the tier drag handlers.
    // We intercept when in quadrant mode.
    on(token,'pointerdown',function(e){
      if(currentMode !== 'quadrant') return;
      if(e.button !== 0) return;
      if(!token.closest('.q-zone')) return;

      e.preventDefault();
      e.stopPropagation();
      token.setPointerCapture(e.pointerId);
      document.body.classList.add('dragging-item');

      var zone = token.closest('.q-zone');
      var originZone = zone;
      var originLeft = token.style.left;
      var originTop = token.style.top;
      var sz = qTokenSize();

      var ghost = token.cloneNode(true);
      ghost.className = 'q-drag-ghost';
      ghost.style.width = sz+'px';
      ghost.style.height = sz+'px';
      document.body.appendChild(ghost);
      token.classList.add('drag-hidden');

      var r = token.getBoundingClientRect();
      var offsetX = e.clientX - r.left;
      var offsetY = e.clientY - r.top;
      var x = e.clientX, y = e.clientY;
      var raf = null;
      var currentDZ = null;

      function move(ev){ x=ev.clientX; y=ev.clientY; }

      function up(){
        try{token.releasePointerCapture(e.pointerId);}catch(_){}
        document.removeEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
        document.removeEventListener('pointerup',up,false);
        cancelAnimationFrame(raf);
        if(ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        token.classList.remove('drag-hidden');
        document.body.classList.remove('dragging-item');

        // Clear drag-over
        qZones.forEach(function(z){z.classList.remove('drag-over');});
        if(tray) tray.classList.remove('drag-over');

        // Check where we dropped
        var el = document.elementFromPoint(x,y);
        var dropZone = el ? el.closest('.q-zone') : null;
        var dropTray = el ? el.closest('#tray') : null;

        if(dropTray){
          // Return to tray
          var fromId = ensureId(originZone,'zone');
          token.style.position = '';
          token.style.left = '';
          token.style.top = '';
          token.style.width = '';
          token.style.height = '';
          flipZones([tray],function(){ tray.appendChild(token); });
          recordPlacement(token.id, fromId, 'tray', '');
          live('Returned "'+(token.innerText||'item')+'" to Image Storage');
          vib(6);
          scheduleQuadrantSave();
        } else if(dropZone){
          // Place in (possibly different) quadrant zone
          var rect = dropZone.getBoundingClientRect();
          var nx = x - rect.left - sz/2;
          var ny = y - rect.top - sz/2;
          nx = Math.max(0, Math.min(nx, rect.width - sz));
          ny = Math.max(0, Math.min(ny, rect.height - sz));

          if(dropZone !== originZone){
            var fromId2 = ensureId(originZone,'zone');
            dropZone.appendChild(token);
            recordPlacement(token.id, fromId2, dropZone.id, '');
          }
          token.style.position = 'absolute';
          token.style.left = (nx/rect.width*100)+'%';
          token.style.top = (ny/rect.height*100)+'%';
          token.classList.add('animate-drop');
          setTimeout(function(){token.classList.remove('animate-drop');},180);
          vib(6);
          scheduleQuadrantSave();
        } else {
          // Snap back to original position
          token.style.left = originLeft;
          token.style.top = originTop;
        }
        currentDZ = null;
      }

      function loop(){
        raf = requestAnimationFrame(loop);
        ghost.style.transform = 'translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';

        // Hit-test
        ghost.style.pointerEvents='none';
        var el = document.elementFromPoint(x,y);
        ghost.style.pointerEvents='';
        var dz = el ? (el.closest('.q-zone') || el.closest('#tray')) : null;

        if(currentDZ && currentDZ !== dz) currentDZ.classList.remove('drag-over');
        if(dz && dz !== currentDZ) dz.classList.add('drag-over');
        currentDZ = dz || null;
      }

      document.addEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
      document.addEventListener('pointerup',up,false);
      loop();
    }, _supportsPassive?{passive:false}:false);
  }

  /* ---------- Drop from tray to quadrant (pointer drag) ---------- */
  // Override zone detection for quadrant mode so tray drags land on quadrant zones
  var _origGetDropZone = null;

  function patchDropZoneDetection(){
    if(typeof getDropZoneFromElement !== 'function') return;
    if(_origGetDropZone) return; // already patched
    _origGetDropZone = getDropZoneFromElement;

    // Replace the global function
    window.getDropZoneFromElement = function(el){
      if(currentMode === 'quadrant'){
        if(!el) return null;
        var qz = el.closest('.q-zone');
        if(qz) return qz;
        var tr = el.closest('#tray');
        if(tr) return tr;
        return null;
      }
      return _origGetDropZone(el);
    };
  }

  /* ---------- Mode switching ---------- */
  function setMode(mode){
    currentMode = mode;
    var tierBoard = $('#tierBoard');
    if(!qBoard) return;

    if(mode === 'quadrant'){
      document.body.classList.add('quadrant-mode');
      if(tierBoard) tierBoard.classList.add('hidden-mode');
      qBoard.classList.add('active');
      // Hide prompt stack (tier-specific suggestions)
      var promptWrap = $('#promptStack');
      if(promptWrap) promptWrap.classList.add('hidden');
      // Move tokens from tier rows back to tray (they're tier-specific)
      $$('.tier-drop .token').forEach(function(tok){
        tok.style.position = '';
        tok.style.left = '';
        tok.style.top = '';
        tray.appendChild(tok);
      });
      // Load quadrant-specific token placements
      loadQuadrantData();
    } else {
      document.body.classList.remove('quadrant-mode');
      if(tierBoard) tierBoard.classList.remove('hidden-mode');
      qBoard.classList.remove('active');
      // Save quadrant data before moving tokens back
      saveQuadrantData();
      // Move quadrant tokens back to tray
      qZones.forEach(function(z){
        $$('.token',z).forEach(function(tok){
          tok.style.position = '';
          tok.style.left = '';
          tok.style.top = '';
          tray.appendChild(tok);
        });
      });
    }
    // Update toggle buttons
    $$('.mode-toggle-btn').forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    // Update save button text
    var saveBtn = $('#saveBtn');
    if(saveBtn){
      var saveTxt = saveBtn.querySelector('span:last-child');
      if(saveTxt) saveTxt.textContent = (mode === 'quadrant') ? 'Save Chart' : 'Save Tierlist';
    }
    try{localStorage.setItem('tm_mode', mode);}catch(e){}
    if(typeof updateTrayCount === 'function') updateTrayCount();
  }

  /* ---------- Persistence (quadrant-specific data) ---------- */
  function saveQuadrantData(){
    var data = {
      labels: {
        top: qAxisLabels.top ? qAxisLabels.top.textContent : '',
        bottom: qAxisLabels.bottom ? qAxisLabels.bottom.textContent : '',
        left: qAxisLabels.left ? qAxisLabels.left.textContent : '',
        right: qAxisLabels.right ? qAxisLabels.right.textContent : ''
      },
      zones: {},
      colors: {}
    };
    Q_POSITIONS.forEach(function(pos,i){
      var z = qZones[i];
      if(!z) return;
      var tokens = [];
      $$('.token',z).forEach(function(tok){
        var lbl = tok.querySelector('.label');
        var img = tok.querySelector('img');
        var isCustom = tok.dataset.custom === 'true';
        var entry = {
          left: tok.style.left || '10%',
          top: tok.style.top || '10%'
        };
        if(lbl){
          entry.type = 'name';
          entry.name = lbl.textContent;
          entry.color = tok.style.background;
          entry.textColor = lbl.style.color;
          entry.custom = isCustom;
        } else if(img){
          entry.type = 'image';
          entry.src = img.src;
          entry.alt = img.alt;
          entry.custom = true;
        }
        tokens.push(entry);
      });
      data.zones[pos] = tokens;
      if(z.dataset.customColor) data.colors[pos] = z.dataset.customColor;
    });
    try{localStorage.setItem(QUADRANT_STORAGE_KEY, JSON.stringify(data));}catch(e){}
  }

  function loadQuadrantData(){
    try{
      var json = localStorage.getItem(QUADRANT_STORAGE_KEY);
      if(!json) return;
      var data = JSON.parse(json);
      if(!data) return;

      // Restore axis labels
      if(data.labels){
        ['top','bottom','left','right'].forEach(function(dir){
          if(qAxisLabels[dir] && data.labels[dir] !== undefined){
            qAxisLabels[dir].textContent = data.labels[dir];
          }
        });
      }

      // Restore quadrant colors
      if(data.colors){
        Q_POSITIONS.forEach(function(pos,i){
          if(data.colors[pos] && qZones[i]){
            applyQZoneColor(qZones[i], data.colors[pos], pos);
            var ci = qZones[i].querySelector('.q-color-input');
            var cd = qZones[i].querySelector('.q-color-dot');
            if(ci) ci.value = data.colors[pos];
            if(cd) cd.style.background = colorPickDotColor(data.colors[pos]);
          }
        });
      }

      // Restore tokens in zones
      if(data.zones){
        Q_POSITIONS.forEach(function(pos,i){
          var zoneTokens = data.zones[pos];
          if(!zoneTokens || !qZones[i]) return;
          zoneTokens.forEach(function(td){
            var tok = null;
            if(td.type === 'name'){
              // Try to find this token in the tray first (by name match)
              tok = findTrayToken(td.name, td.type);
              if(!tok){
                tok = buildNameToken(td.name, td.color || '#7da7ff', !!td.custom, td.textColor);
              }
            } else if(td.type === 'image'){
              tok = findTrayToken(td.alt || td.src, td.type, td.src);
              if(!tok){
                tok = buildImageToken(td.src, td.alt);
              }
            }
            if(tok){
              var sz = qTokenSize();
              tok.style.position = 'absolute';
              tok.style.left = td.left || '10%';
              tok.style.top = td.top || '10%';
              qZones[i].appendChild(tok);
              enableQuadrantTokenDrag(tok);
              refitQToken(tok);
            }
          });
        });
      }
    }catch(e){}
  }

  /* Find a token in the tray by name/type to reuse it */
  function findTrayToken(name, type, src){
    if(!tray) return null;
    var tokens = $$('.token', tray);
    for(var i=0;i<tokens.length;i++){
      var tok = tokens[i];
      if(type === 'name'){
        var lbl = tok.querySelector('.label');
        if(lbl && lbl.textContent === name) return tok;
      } else if(type === 'image'){
        var img = tok.querySelector('img');
        if(img && (img.src === src || img.alt === name)) return tok;
      }
    }
    return null;
  }

  /* Refit token label for smaller size in quadrant */
  function refitQToken(tok){
    var lbl = tok.querySelector('.label');
    if(!lbl) return;
    var sz = qTokenSize();
    var pad = 4;
    var maxW = sz - pad*2;
    var text = lbl.textContent;
    var px = 13;
    for(;px >= 8; px--){
      if(measureText(text,'900',px) <= maxW) break;
    }
    lbl.style.fontSize = Math.max(px,8)+'px';
    lbl.style.fontWeight = '900';
    lbl.style.padding = pad+'px';
  }

  var _qSaveTimeout = null;
  function scheduleQuadrantSave(){
    clearTimeout(_qSaveTimeout);
    _qSaveTimeout = setTimeout(function(){
      saveQuadrantData();
      if(typeof updateTrayCount === 'function') updateTrayCount();
    }, 800);
  }

  /* ---------- Observe quadrant zone mutations for auto-save ---------- */
  function startQuadrantAutoSave(){
    var onMutate = function(){ scheduleQuadrantSave(); };
    qZones.forEach(function(z){
      var obs = new MutationObserver(onMutate);
      obs.observe(z, {childList:true, subtree:true});
    });
    // Also save when axis labels change
    ['top','bottom','left','right'].forEach(function(dir){
      if(qAxisLabels[dir]) on(qAxisLabels[dir],'input',scheduleQuadrantSave);
    });
  }

  /* ---------- Export quadrant as PNG ---------- */
  function setupQuadrantExport(){
    var origSaveBtn = $('#saveBtn');
    if(!origSaveBtn) return;

    // script.js handler returns early in quadrant mode, so this handler runs after
    on(origSaveBtn, 'click', function(){
      if(currentMode !== 'quadrant') return;
      exportQuadrantPng();
    });
  }

  function exportQuadrantPng(){
    if(typeof replayGif === 'function') replayGif($('#saveBtn'));

    var panel = $('#boardPanel');
    var cloneWrap = document.createElement('div');
    cloneWrap.style.position='fixed';cloneWrap.style.left='-99999px';cloneWrap.style.top='0';

    var clone = panel.cloneNode(true);
    clone.style.width = '1200px';
    clone.style.maxWidth = '1200px';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.borderRadius = '0';

    // Hide tier board in clone, show quadrant
    var tierClone = clone.querySelector('#tierBoard');
    if(tierClone) tierClone.style.display = 'none';
    var qClone = clone.querySelector('#quadrantBoard');
    if(qClone){ qClone.style.display = 'block'; qClone.classList.add('q-export-mode'); }

    // Hide prompt stack and edit chrome
    var style = document.createElement('style');
    style.textContent = [
      '.prompt-stack-wrap{display:none !important}',
      '.title-pen{display:none !important}',
      '.board-title-wrap{text-align:center !important;margin-bottom:20px !important}',
      '.board-title{text-align:center !important;font-size:28px !important}',
      '.q-color-pick{display:none !important}',
      '.q-zone-label{display:none !important}',
      '.token-del{display:none !important}'
    ].join('\n');
    clone.appendChild(style);

    // Handle title
    var title = clone.querySelector('.board-title');
    var titleText = title ? title.textContent.replace(/\s+/g,'') : '';
    if(!titleText){
      var wrap = title ? title.parentElement : null;
      if(wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    cloneWrap.appendChild(clone);
    document.body.appendChild(cloneWrap);

    if(typeof htmlToImage === 'undefined' || typeof htmlToImage.toPng !== 'function'){
      cloneWrap.remove();
      if(typeof showSaveToast === 'function') showSaveToast('Export library failed to load');
      return;
    }

    htmlToImage.toPng(clone, {
      pixelRatio: 2,
      width: 1200,
      backgroundColor: cssVar('--surface') || '#ffffff',
      fetchRequestInit: {mode:'cors',cache:'no-cache'},
      cacheBust:true
    }).then(function(dataUrl){
      var boardTitle = ($('.board-title') || {}).textContent || '';
      var slug = boardTitle.trim().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = (slug || 'quadrant-chart')+'.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){a.remove();},300);
      cloneWrap.remove();
      if(typeof showSaveToast === 'function') showSaveToast('Saved!');
    }).catch(function(err){
      cloneWrap.remove();
      if(typeof showSaveToast === 'function') showSaveToast('Export failed — try again');
      console.error('Quadrant PNG export error:', err);
    });
  }

  /* ---------- Hook into existing token creation ---------- */
  // Whenever a token is built, also attach quadrant drag handler
  var _origBuildTokenBase = window.buildTokenBase;
  if(_origBuildTokenBase){
    window.buildTokenBase = function(isCustom){
      var el = _origBuildTokenBase(isCustom);
      enableQuadrantTokenDrag(el);
      return el;
    };
  }

  /* ---------- Radial picker override for quadrant mode ---------- */
  // On mobile in quadrant mode, tapping a tray token should show quadrant zone options
  function openQuadrantRadial(token){
    var radial = $('#radialPicker');
    if(!radial || !isSmall()) return;

    // Remove existing backdrop handler
    if(radial._backdropHandler){
      radial.removeEventListener('pointerdown', radial._backdropHandler);
      delete radial._backdropHandler;
    }

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cx = vw/2;
    var cy = vh/2;

    var radialOpts = $('.radial-options', radial);
    var radialCloseBtn = $('.radial-close', radial);
    if(!radialOpts) return;

    var labels = ['Top Left','Top Right','Bottom Left','Bottom Right'];
    var colors = [Q_DEFAULTS.tl.solid, Q_DEFAULTS.tr.solid, Q_DEFAULTS.bl.solid, Q_DEFAULTS.br.solid];

    // Check for custom colors
    qZones.forEach(function(z,i){
      if(z.dataset.customColor) colors[i] = z.dataset.customColor;
    });

    var N = 4;
    var BTN_H = 52, GAP = 10;
    var totalH = N*BTN_H + (N-1)*GAP;
    var startY = cy - totalH/2;

    if(radialCloseBtn){
      radialCloseBtn.style.left = cx+'px';
      radialCloseBtn.style.top = (startY + totalH + GAP + 26)+'px';
    }

    radialOpts.innerHTML = '';
    for(var j=0;j<N;j++){
      (function(j){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'radial-option radial-btn';
        btn.style.left = cx+'px';
        btn.style.top = (startY + j*(BTN_H+GAP)+BTN_H/2)+'px';
        btn.style.transitionDelay = (j*20)+'ms';

        var dot = document.createElement('span');
        dot.className = 'dot';
        dot.textContent = labels[j];
        dot.style.background = colors[j];
        dot.style.color = '#ffffff';
        btn.appendChild(dot);

        on(btn,'click',function(){
          var zone = qZones[j];
          if(!zone || !token) return;
          var fromId = ensureId(token.parentElement,'zone');
          var origin = token.parentElement;
          var originNext = token.nextElementSibling;
          var originBeforeId = originNext ? ensureId(originNext,'tok') : '';

          // Place at center of zone
          var rect = zone.getBoundingClientRect();
          var sz = qTokenSize();
          var cx2 = (rect.width/2 - sz/2);
          var cy2 = (rect.height/2 - sz/2);
          // Add small random offset to avoid stacking
          cx2 += (Math.random()-0.5)*40;
          cy2 += (Math.random()-0.5)*40;
          cx2 = Math.max(0, Math.min(cx2, rect.width - sz));
          cy2 = Math.max(0, Math.min(cy2, rect.height - sz));

          if(origin.id === 'tray'){
            flipZones([origin],function(){ zone.appendChild(token); });
          } else {
            zone.appendChild(token);
          }
          token.style.position = 'absolute';
          token.style.left = (cx2/rect.width*100)+'%';
          token.style.top = (cy2/rect.height*100)+'%';
          token.classList.remove('selected');

          enableQuadrantTokenDrag(token);
          refitQToken(token);
          recordPlacement(token.id, fromId, zone.id, originBeforeId);
          vib(7);
          if(typeof closeRadial === 'function') closeRadial();
          scheduleQuadrantSave();
        });

        radialOpts.appendChild(btn);
      })(j);
    }

    // Backdrop handler
    function backdrop(ev){
      if(ev.target.closest('.radial-option') || ev.target.closest('.radial-close')) return;
      if(typeof closeRadial === 'function') closeRadial();
    }
    radial.addEventListener('pointerdown', backdrop, {passive:false});
    radial._backdropHandler = backdrop;

    // Show radial
    if(typeof _savedScrollY !== 'undefined' && _savedScrollY === null){
      window._savedScrollY = window.pageYOffset;
    }
    document.body.style.top = '-'+(window.pageYOffset||0)+'px';
    document.body.classList.add('radial-open');
    radial.classList.remove('hidden');
    radial.classList.add('visible','show');
    radial.setAttribute('aria-hidden','false');
    setTimeout(function(){radial.classList.remove('show');}, 160+N*20);
  }

  // Patch the token click handler to use quadrant radial in quadrant mode
  var _origOpenRadial = window.openRadial;
  if(_origOpenRadial){
    window.openRadial = function(token){
      if(currentMode === 'quadrant'){
        openQuadrantRadial(token);
      } else {
        _origOpenRadial(token);
      }
    };
  }

  /* ---------- Theme change hook ---------- */
  // When theme changes, refresh quadrant zone colors
  function refreshQZoneColors(){
    if(!qBoard) return;
    qZones.forEach(function(z,i){
      if(z.dataset.customColor){
        applyQZoneColor(z, z.dataset.customColor, Q_POSITIONS[i]);
      }
      // Default colors are handled by CSS, so no JS needed for non-custom
    });
  }

  // Watch for theme changes via attribute mutation
  var _themeObs = new MutationObserver(function(){
    refreshQZoneColors();
  });
  _themeObs.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    // Wait a tick so script.js init runs first
    setTimeout(function(){
      // Build quadrant board DOM
      var boardPanel = $('#boardPanel');
      var tierBoard = $('#tierBoard');
      if(!boardPanel || !tierBoard) return;

      var qContainer = document.createElement('div');
      qContainer.id = 'quadrantBoard';
      var qContent = buildQuadrantBoard();
      qContainer.appendChild(qContent);
      tierBoard.parentNode.insertBefore(qContainer, tierBoard.nextSibling);
      qBoard = qContainer;

      // Patch drop zone detection for quadrant mode
      patchDropZoneDetection();

      // Setup export
      setupQuadrantExport();

      // Setup mode toggle buttons
      var toggleWrap = document.createElement('div');
      toggleWrap.className = 'mode-toggle-wrap';
      toggleWrap.innerHTML = [
        '<button class="mode-toggle-btn active" data-mode="tier" type="button">',
        '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
        '  <span>Tier List</span>',
        '</button>',
        '<button class="mode-toggle-btn" data-mode="quadrant" type="button">',
        '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
        '  <span>Quadrant</span>',
        '</button>'
      ].join('');

      // Insert toggle before the board title
      var titleWrap = boardPanel.querySelector('.board-title-wrap');
      if(titleWrap){
        boardPanel.insertBefore(toggleWrap, titleWrap);
      } else {
        boardPanel.insertBefore(toggleWrap, boardPanel.firstChild);
      }

      // Wire toggle clicks
      $$('.mode-toggle-btn').forEach(function(btn){
        on(btn,'click',function(){
          var mode = btn.dataset.mode;
          if(mode === currentMode) return;
          setMode(mode);
        });
      });

      // Start auto-save for quadrant data
      startQuadrantAutoSave();

      // Restore mode from localStorage (but always default to tier)
      var savedMode = null;
      try{ savedMode = localStorage.getItem('tm_mode'); }catch(e){}
      if(savedMode === 'quadrant'){
        setMode('quadrant');
      }

      // Enable click-to-place on tray for quadrant mode
      // (Already handled by the shared enableClickToPlace)

      // Expose for other scripts
      window.currentChartMode = function(){ return currentMode; };
      window.setChartMode = setMode;
    }, 50);
  });

  /* Expose scheduleQuadrantSave globally so script.js auto-save can call it */
  window.scheduleQuadrantSave = function(){ scheduleQuadrantSave(); };

})();
