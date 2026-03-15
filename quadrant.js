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
  var _qPlacedTokenIds = {}; // track which tray tokens are placed in quadrant (by token id)

  /* Default quadrant colors */
  var Q_DEFAULTS = {
    tl: { bg: 'rgba(239,68,68,.12)', solid: '#ef4444' },
    tr: { bg: 'rgba(34,197,94,.12)',  solid: '#22c55e' },
    bl: { bg: 'rgba(251,191,36,.12)', solid: '#fbbf24' },
    br: { bg: 'rgba(59,130,246,.12)', solid: '#3b82f6' }
  };

  var Q_POSITIONS = ['tl','tr','bl','br'];

  /* ---------- Z-index stacking counter ---------- */
  var _qZCounter = 10; // start above the CSS baseline
  function nextQZ(){ return ++_qZCounter; }
  function bringToFront(tok){ tok.style.zIndex = nextQZ(); }

  /* Default axis labels */
  var DEFAULT_LABELS = {
    top: 'HIGH',
    bottom: 'LOW',
    left: 'LOW',
    right: 'HIGH'
  };

  /* ---------- Dot+name pin dimensions ---------- */
  var Q_DOT_SIZE = 14; // diameter of the color dot (+15%)
  var Q_PIN_HEIGHT = 23; // total pin height (dot + name sit inline) (+15%)

  /* ---------- Token size for quadrant (matches CSS) ---------- */
  function qTokenSize(){
    // Returns the hit-area height for a dot-name pin
    return Q_PIN_HEIGHT;
  }

  /* ---------- Clamp token position allowing overflow toward center axes ---------- */
  function clampQPosition(x, y, w, h, sz, zone){
    var pos = zone && zone.id ? zone.id.replace('qzone-','') : '';
    var pinH = Q_PIN_HEIGHT;
    var pinW = 80; // approximate max pin width
    var minX = 0, maxX = w - pinW;
    var minY = 0, maxY = h - pinH;
    // Allow pins to extend past the axis-side edges slightly
    if(pos === 'tl' || pos === 'bl') maxX = w - 10;
    if(pos === 'tr' || pos === 'br') minX = -10;
    if(pos === 'tl' || pos === 'tr') maxY = h - 6;
    if(pos === 'bl' || pos === 'br') minY = -6;
    return { x: Math.max(minX, Math.min(x, maxX)), y: Math.max(minY, Math.min(y, maxY)) };
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
    qZones = [];

    for(var i=0;i<4;i++){
      var zone = document.createElement('div');
      zone.className = 'q-zone q-zone--'+positions[i]+' dropzone';
      zone.id = 'qzone-'+positions[i];
      zone.setAttribute('role','list');
      zone.setAttribute('tabindex','0');

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

  /* ---------- Build a compact dot+name pin for quadrant use ---------- */
  function buildQuadrantPin(name, bgColor, isImage, imgSrc, imgAlt){
    var pin = document.createElement('div');
    pin.className = 'q-pin';
    pin.id = uid();
    pin.setAttribute('tabindex','0');
    pin.style.touchAction = 'none';

    var dot = document.createElement('span');
    dot.className = 'q-pin-dot';
    if(isImage && imgSrc){
      dot.style.backgroundImage = 'url(' + imgSrc + ')';
      dot.style.backgroundSize = 'cover';
      dot.style.backgroundPosition = 'center';
    } else {
      dot.style.background = bgColor || '#7da7ff';
    }
    pin.appendChild(dot);

    var label = document.createElement('span');
    label.className = 'q-pin-label';
    label.textContent = name || imgAlt || '';
    pin.appendChild(label);

    // Store source data for persistence
    if(isImage){
      pin.dataset.pinType = 'image';
      pin.dataset.pinSrc = imgSrc || '';
      pin.dataset.pinAlt = imgAlt || '';
    } else {
      pin.dataset.pinType = 'name';
      pin.dataset.pinColor = bgColor || '#7da7ff';
    }
    pin.dataset.pinName = name || imgAlt || '';

    // Click to select/deselect
    on(pin,'click',function(e){
      if(e.target.closest('.q-pin-del')) return;
      var already = pin.classList.contains('selected');
      // Deselect all tokens and pins
      $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
      $$('.q-pin.selected').forEach(function(p){ p.classList.remove('selected'); });
      if(!already) pin.classList.add('selected');
    });

    // Delete button
    var del = document.createElement('button');
    del.className = 'q-pin-del';
    del.type = 'button';
    del.innerHTML = '&times;';
    del.setAttribute('aria-label','Remove');
    on(del,'click',function(e){
      e.stopPropagation();
      var srcId = pin.dataset.sourceTokenId;
      pin.remove();
      if(srcId) unhideTrayToken(srcId);
      scheduleQuadrantSave();
    });
    pin.appendChild(del);

    enableQuadrantTokenDrag(pin);
    return pin;
  }

  /* ---------- Clone a tray token as a compact pin for quadrant ---------- */
  function cloneTokenForQuadrant(original){
    var lbl = original.querySelector('.label');
    var img = original.querySelector('img');
    var pin;
    if(lbl){
      pin = buildQuadrantPin(lbl.textContent, original.style.background || '#7da7ff', false);
    } else if(img){
      pin = buildQuadrantPin(img.alt, null, true, img.src, img.alt);
    } else {
      return null;
    }
    // Track source token for tray hiding
    pin.dataset.sourceTokenId = original.id || '';
    return pin;
  }

  /* ---------- Tray token hiding/showing ---------- */
  function hideTrayToken(tokenId){
    if(!tokenId) return;
    _qPlacedTokenIds[tokenId] = true;
    var tok = document.getElementById(tokenId);
    if(tok && tok.closest('#tray')){
      tok.classList.add('q-placed-hidden');
    }
    if(typeof updateTrayCount === 'function') updateTrayCount();
  }

  function unhideTrayToken(tokenId){
    if(!tokenId) return;
    delete _qPlacedTokenIds[tokenId];
    var tok = document.getElementById(tokenId);
    if(tok){
      tok.classList.remove('q-placed-hidden');
    }
    if(typeof updateTrayCount === 'function') updateTrayCount();
  }

  function syncTrayVisibility(){
    // Rebuild _qPlacedTokenIds from current quadrant pins
    _qPlacedTokenIds = {};
    qZones.forEach(function(z){
      $$('.q-pin',z).forEach(function(pin){
        var srcId = pin.dataset.sourceTokenId;
        if(srcId) _qPlacedTokenIds[srcId] = true;
      });
    });
    // Apply visibility
    if(tray){
      $$('.token',tray).forEach(function(tok){
        if(_qPlacedTokenIds[tok.id]){
          tok.classList.add('q-placed-hidden');
        } else {
          tok.classList.remove('q-placed-hidden');
        }
      });
    }
  }

  function clearAllTrayHiding(){
    _qPlacedTokenIds = {};
    if(tray){
      $$('.token.q-placed-hidden',tray).forEach(function(tok){
        tok.classList.remove('q-placed-hidden');
      });
    }
  }

  /* ---------- Free-placement drag within quadrant zones ---------- */
  function enableQuadrantDrop(zone){
    // Click-to-place: if a token/pin is selected, place it at click position
    on(zone,'click',function(e){
      if(e.target.closest('.q-pin') || e.target.closest('.token')) return;
      // Check for selected pin first, then selected token
      var selected = $('.q-pin.selected') || $('.token.selected');
      if(!selected) return;

      var isPin = selected.classList.contains('q-pin');

      // If pin is already in a q-zone, update its position
      if(isPin && selected.closest('.q-zone') === zone){
        var rect = zone.getBoundingClientRect();
        var sz = Q_PIN_HEIGHT;
        var x = e.clientX - rect.left - 6;
        var y = e.clientY - rect.top - sz/2;
        var clamped = clampQPosition(x, y, rect.width, rect.height, sz, zone);
        x = clamped.x; y = clamped.y;
        selected.style.left = (x/rect.width*100)+'%';
        selected.style.top = (y/rect.height*100)+'%';
        selected.classList.remove('selected');
        bringToFront(selected);
        scheduleQuadrantSave();
        return;
      }

      var origin = selected.parentElement;
      var fromTray = (origin.id === 'tray');

      var rect2 = zone.getBoundingClientRect();
      var sz2 = Q_PIN_HEIGHT;
      var nx = e.clientX - rect2.left - 6;
      var ny = e.clientY - rect2.top - sz2/2;
      var clamped2 = clampQPosition(nx, ny, rect2.width, rect2.height, sz2, zone);
      nx = clamped2.x; ny = clamped2.y;

      var placed;
      if(fromTray){
        placed = cloneTokenForQuadrant(selected);
        if(!placed) return;
        selected.classList.remove('selected');
        zone.appendChild(placed);
        hideTrayToken(selected.id);
      } else if(isPin){
        // Moving pin between quadrant zones
        placed = selected;
        zone.appendChild(placed);
      } else {
        placed = selected;
        zone.appendChild(placed);
      }
      placed.style.position = 'absolute';
      placed.style.left = (nx/rect2.width*100)+'%';
      placed.style.top = (ny/rect2.height*100)+'%';
      placed.classList.remove('selected');
      bringToFront(placed);

      live('Placed "'+(placed.textContent||'item').trim()+'" on quadrant chart');
      vib(6);
      scheduleQuadrantSave();
    });
  }

  /* ---------- Pointer drag for pins within quadrant ---------- */
  function enableQuadrantTokenDrag(pin){
    // Guard: only attach one handler per pin
    if(pin._qDragAttached) return;
    pin._qDragAttached = true;

    on(pin,'pointerdown',function(e){
      if(currentMode !== 'quadrant') return;
      if(e.button !== 0) return;
      if(!pin.closest('.q-zone')) return;
      // Ignore clicks on the delete button
      if(e.target.closest('.q-pin-del')) return;

      e.preventDefault();
      e.stopPropagation();
      pin.setPointerCapture(e.pointerId);
      bringToFront(pin);

      // Lock viewport
      document.body.classList.add('dragging-item','q-dragging');
      document.documentElement.classList.add('q-dragging-lock');

      var zone = pin.closest('.q-zone');
      var originZone = zone;
      var originLeft = pin.style.left;
      var originTop = pin.style.top;
      var savedZIndex = pin.style.zIndex || '';

      // --- Stay-in-zone approach: no reparenting, zoom-proof ---
      // Convert current % position to px within zone
      var zoneRect = zone.getBoundingClientRect();
      var startPxX = (parseFloat(originLeft) || 0) / 100 * zoneRect.width;
      var startPxY = (parseFloat(originTop) || 0) / 100 * zoneRect.height;

      // Where the finger initially touched relative to the zone
      var fingerStartX = e.clientX - zoneRect.left;
      var fingerStartY = e.clientY - zoneRect.top;

      // Offset from pin origin to finger touch point
      var grabOffX = fingerStartX - startPxX;
      var grabOffY = fingerStartY - startPxY;

      // Visual feedback: lift the pin
      pin.classList.add('q-dragging-token');
      pin.style.transition = 'none';
      pin.style.zIndex = '9999';
      pin.style.willChange = 'transform';

      var lastDZ = null;
      var _curPxX = startPxX, _curPxY = startPxY;
      var _targetPxX = startPxX, _targetPxY = startPxY;
      var _rafId = 0;
      var _dragging = true;
      // Track if finger has left the origin zone (for cross-zone drops)
      var _crossZone = null;

      // RAF loop: interpolate toward target for buttery-smooth movement
      function rafLoop(){
        if(!_dragging) return;
        // Lerp factor: 1.0 = instant (no smoothing lag), lower = smoother but laggier
        _curPxX += (_targetPxX - _curPxX) * 0.7;
        _curPxY += (_targetPxY - _curPxY) * 0.7;
        // Apply as transform offset from the pin's current %-based position
        var offsetX = _curPxX - startPxX;
        var offsetY = _curPxY - startPxY;
        pin.style.transform = 'translate3d('+offsetX+'px,'+offsetY+'px,0) scale(1.06)';
        _rafId = requestAnimationFrame(rafLoop);
      }
      _rafId = requestAnimationFrame(rafLoop);

      function move(ev){
        ev.preventDefault();
        // Fresh zone rect each move — handles scroll, resize, or zoom changes
        var zr = zone.getBoundingClientRect();
        // Finger position relative to zone
        var fx = ev.clientX - zr.left;
        var fy = ev.clientY - zr.top;
        // Pin position = finger minus grab offset
        _targetPxX = fx - grabOffX;
        _targetPxY = fy - grabOffY;

        // Hit-test under finger for cross-zone detection
        pin.style.pointerEvents = 'none';
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        pin.style.pointerEvents = 'auto';
        var dz = el ? (el.closest('.q-zone') || el.closest('#tray')) : null;

        if(lastDZ && lastDZ !== dz) lastDZ.classList.remove('drag-over');
        if(dz && dz !== lastDZ){ dz.classList.add('drag-over'); vib(4); }
        lastDZ = dz || null;
        _crossZone = dz;
      }

      function up(ev){
        _dragging = false;
        cancelAnimationFrame(_rafId);
        try{pin.releasePointerCapture(e.pointerId);}catch(_){}
        document.removeEventListener('pointermove',move,false);
        document.removeEventListener('pointerup',up,false);
        document.removeEventListener('pointercancel',up,false);

        // Unlock viewport
        document.body.classList.remove('dragging-item','q-dragging');
        document.documentElement.classList.remove('q-dragging-lock');

        // Clear drag-over highlights
        qZones.forEach(function(z){z.classList.remove('drag-over');});
        if(tray) tray.classList.remove('drag-over');

        // Reset visual overrides
        pin.classList.remove('q-dragging-token');
        pin.style.transform = '';
        pin.style.transition = '';
        pin.style.willChange = '';

        // Determine drop target
        pin.style.pointerEvents = 'none';
        var dropX = ev.clientX, dropY = ev.clientY;
        var el = document.elementFromPoint(dropX, dropY);
        pin.style.pointerEvents = '';
        var dropZone = el ? el.closest('.q-zone') : null;
        var dropTray = el ? el.closest('#tray') : null;

        if(dropTray){
          // Destroy pin and unhide the source tray token
          var srcId = pin.dataset.sourceTokenId;
          pin.remove();
          if(srcId) unhideTrayToken(srcId);
          live('Removed from quadrant chart');
          vib(6);
          scheduleQuadrantSave();
        } else if(dropZone){
          // Compute final position in drop zone coordinates
          var dRect = dropZone.getBoundingClientRect();
          var pinH = Q_PIN_HEIGHT;
          var nx = dropX - dRect.left - grabOffX;
          var ny = dropY - dRect.top - grabOffY;
          var clampedDrop = clampQPosition(nx, ny, dRect.width, dRect.height, pinH, dropZone);
          nx = clampedDrop.x; ny = clampedDrop.y;

          if(dropZone !== originZone){
            var fromId2 = ensureId(originZone,'zone');
            recordPlacement(pin.id, fromId2, dropZone.id, '');
            dropZone.appendChild(pin);
          }
          pin.style.position = 'absolute';
          pin.style.left = (nx/dRect.width*100)+'%';
          pin.style.top = (ny/dRect.height*100)+'%';
          pin.style.zIndex = '';
          bringToFront(pin);
          vib(6);
          scheduleQuadrantSave();
        } else {
          // Snap back to original position
          pin.style.position = 'absolute';
          pin.style.left = originLeft;
          pin.style.top = originTop;
          pin.style.zIndex = savedZIndex;
        }
      }

      // Non-passive so preventDefault blocks scroll/zoom
      document.addEventListener('pointermove',move,{passive:false,capture:false});
      document.addEventListener('pointerup',up,false);
      document.addEventListener('pointercancel',up,false);
    }, {passive:false,capture:false});
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

    // Always hide battles when switching away
    if(typeof hideBattleMode === 'function') hideBattleMode();

    if(mode === 'quadrant'){
      document.body.classList.add('quadrant-mode');
      if(tierBoard) tierBoard.classList.add('hidden-mode');
      qBoard.classList.add('active');
      if(typeof hidePromptStack === 'function') hidePromptStack();
      loadQuadrantData();
    } else if(mode === 'battles'){
      document.body.classList.remove('quadrant-mode');
      if(tierBoard) tierBoard.classList.add('hidden-mode');
      qBoard.classList.remove('active');
      // Save quadrant data then destroy pins
      saveQuadrantData();
      qZones.forEach(function(z){
        $$('.q-pin',z).forEach(function(pin){ pin.remove(); });
        $$('.token',z).forEach(function(tok){ tok.remove(); });
      });
      clearAllTrayHiding();
      if(typeof hidePromptStack === 'function') hidePromptStack();
      if(typeof showBattleMode === 'function') showBattleMode();
    } else {
      document.body.classList.remove('quadrant-mode');
      if(tierBoard) tierBoard.classList.remove('hidden-mode');
      qBoard.classList.remove('active');
      if(typeof showPromptStack === 'function') showPromptStack();
      saveQuadrantData();
      qZones.forEach(function(z){
        $$('.q-pin',z).forEach(function(pin){ pin.remove(); });
        $$('.token',z).forEach(function(tok){ tok.remove(); });
      });
      clearAllTrayHiding();
    }
    // Update toggle buttons
    $$('.mode-toggle-btn').forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    // Update control button labels for the active mode
    var isQ = (mode === 'quadrant');
    var isB = (mode === 'battles');
    var saveBtn = $('#saveBtn');
    if(saveBtn){
      var saveTxt = saveBtn.querySelector('span:last-child');
      if(saveTxt) saveTxt.textContent = isQ ? 'Save Quadrant' : isB ? 'Save Bracket' : 'Save Tierlist';
    }
    var clearBtn = $('#trashClear');
    if(clearBtn){
      var clearTxt = clearBtn.querySelector('span:last-child');
      if(clearTxt) clearTxt.textContent = isQ ? 'Clear Quadrants' : isB ? 'Clear Bracket' : 'Clear Board';
    }
    // Update undo button behavior text for battles
    var undoBtn = $('#undoBtn');
    if(undoBtn){
      var undoTxt = undoBtn.querySelector('span:last-child');
      if(undoTxt) undoTxt.textContent = 'Undo';
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
      var pins = [];
      $$('.q-pin',z).forEach(function(pin){
        var entry = {
          left: pin.style.left || '10%',
          top: pin.style.top || '10%',
          name: pin.dataset.pinName || '',
          sourceTokenId: pin.dataset.sourceTokenId || ''
        };
        if(pin.dataset.pinType === 'image'){
          entry.type = 'image';
          entry.src = pin.dataset.pinSrc || '';
          entry.alt = pin.dataset.pinAlt || '';
        } else {
          entry.type = 'name';
          entry.color = pin.dataset.pinColor || '#7da7ff';
        }
        pins.push(entry);
      });
      data.zones[pos] = pins;
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
          }
        });
      }

      // Restore pins in zones
      if(data.zones){
        Q_POSITIONS.forEach(function(pos,i){
          var zonePins = data.zones[pos];
          if(!zonePins || !qZones[i]) return;
          zonePins.forEach(function(td){
            var pin = null;
            if(td.type === 'image'){
              pin = buildQuadrantPin(td.alt || td.name, null, true, td.src, td.alt);
            } else {
              pin = buildQuadrantPin(td.name, td.color || '#7da7ff', false);
            }
            if(pin){
              pin.style.position = 'absolute';
              pin.style.left = td.left || '10%';
              pin.style.top = td.top || '10%';
              if(td.sourceTokenId) pin.dataset.sourceTokenId = td.sourceTokenId;
              qZones[i].appendChild(pin);
              bringToFront(pin);
            }
          });
        });
      }

      // Sync tray visibility based on loaded pins
      syncTrayVisibility();
    }catch(e){}
  }

  /* ---------- Clear quadrant zones in-place (no reload) ---------- */
  function clearQuadrants(){
    // Remove all quadrant pins
    qZones.forEach(function(z){
      $$('.q-pin',z).forEach(function(pin){ pin.remove(); });
      // Also remove any legacy tokens
      $$('.token',z).forEach(function(tok){ tok.remove(); });
    });
    // Unhide all tray tokens
    clearAllTrayHiding();
    // Reset axis labels to defaults
    ['top','bottom','left','right'].forEach(function(dir){
      if(qAxisLabels[dir]) qAxisLabels[dir].textContent = DEFAULT_LABELS[dir];
    });
    // Reset zone colors to defaults (clear inline styles)
    qZones.forEach(function(z){
      z.style.background = '';
      delete z.dataset.customColor;
    });
    // Clear saved data
    try{ localStorage.removeItem(QUADRANT_STORAGE_KEY); }catch(e){}
    if(typeof showSaveToast === 'function') showSaveToast('Quadrants cleared');
  }

  /* refitQToken is a no-op now — pins auto-size via CSS */
  function refitQToken(tok){ /* no-op for pins */ }

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
    var onMutate = function(){ scheduleQuadrantSave(); syncTrayVisibility(); };
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
      '.board-title-wrap{display:block !important;text-align:center !important;margin-bottom:20px !important}',
      '.board-title{display:block !important;text-align:center !important;font-size:28px !important;white-space:normal !important;word-wrap:break-word !important;overflow-wrap:break-word !important}',
      '.token-del{display:none !important}',
      '.q-pin-del{display:none !important}',
      '.mode-toggle-wrap{display:none !important}',
      // Pin styling for export
      '.q-pin{position:absolute !important}',
      ".q-pin-label{font-family:'Montserrat',ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif !important;font-weight:700 !important;font-size:12px !important}",
      '.q-pin-dot{width:14px !important;height:14px !important;border-radius:50% !important;flex-shrink:0 !important}',
      // Ensure quadrant grid renders properly at export width
      '.q-grid-wrap{min-height:500px !important}',
      '.q-zone{min-height:240px !important;overflow:visible !important}',
      '.q-axis-label{font-size:16px !important}'
    ].join('\n');
    // Inject font @font-face CSS directly into the clone so the SVG renderer can resolve them
    if (typeof _bowlbyFontFaceCSS === 'string' && _bowlbyFontFaceCSS) style.textContent = _bowlbyFontFaceCSS + '\n' + style.textContent;
    if (typeof _montserratFontFaceCSS === 'string' && _montserratFontFaceCSS) style.textContent = _montserratFontFaceCSS + '\n' + style.textContent;
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

    var _qExportFontCSS = (typeof _bowlbyFontFaceCSS === 'string' ? _bowlbyFontFaceCSS : '') + (typeof _montserratFontFaceCSS === 'string' ? _montserratFontFaceCSS : '');
    var _qExportOpts = {
      pixelRatio: 2,
      width: 1200,
      backgroundColor: cssVar('--surface') || '#ffffff',
      fetchRequestInit: {mode:'cors',cache:'no-cache'},
      cacheBust:true
    };
    if(_qExportFontCSS) _qExportOpts.fontEmbedCSS = _qExportFontCSS;
    htmlToImage.toPng(clone, _qExportOpts).then(function(dataUrl){
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

  /* ---------- Arrow-key nudge for precise pin positioning ---------- */
  on(document,'keydown',function(e){
    if(currentMode !== 'quadrant') return;
    var arrows = {ArrowUp:1,ArrowDown:1,ArrowLeft:1,ArrowRight:1};
    if(!arrows[e.key]) return;
    var pin = $('.q-pin.selected');
    if(!pin || !pin.closest('.q-zone')) return;
    e.preventDefault();

    var zone = pin.closest('.q-zone');
    var rect = zone.getBoundingClientRect();
    var sz = Q_PIN_HEIGHT;
    // Shift = 1px micro-nudge, normal = 5px
    var step = e.shiftKey ? 1 : 5;

    var curLeft = parseFloat(pin.style.left) || 0;
    var curTop = parseFloat(pin.style.top) || 0;
    var curX = curLeft / 100 * rect.width;
    var curY = curTop / 100 * rect.height;

    if(e.key === 'ArrowLeft')  curX -= step;
    if(e.key === 'ArrowRight') curX += step;
    if(e.key === 'ArrowUp')    curY -= step;
    if(e.key === 'ArrowDown')  curY += step;

    var clamped = clampQPosition(curX, curY, rect.width, rect.height, sz, zone);
    pin.style.left = (clamped.x / rect.width * 100) + '%';
    pin.style.top = (clamped.y / rect.height * 100) + '%';
    scheduleQuadrantSave();
  });

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

    var labels = ['Top Left','Top Right','Center','Bottom Left','Bottom Right'];
    var colors = [Q_DEFAULTS.tl.solid, Q_DEFAULTS.tr.solid, '#8b7dff', Q_DEFAULTS.bl.solid, Q_DEFAULTS.br.solid];

    // Check for custom colors
    qZones.forEach(function(z,i){
      // Map zone index (0-3) to colors array (0,1,3,4 — skipping 2 which is Center)
      var ci = i < 2 ? i : i + 1;
      if(z.dataset.customColor) colors[ci] = z.dataset.customColor;
    });

    var N = 5;
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
          // Map radial index to zone: 0=tl,1=tr,2=center(tl),3=bl,4=br
          var zoneIdx = j < 2 ? j : (j === 2 ? 0 : j - 1);
          var zone = qZones[zoneIdx];
          if(!zone || !token) return;
          var origin = token.parentElement;
          var fromTray = (origin.id === 'tray');

          var rect = zone.getBoundingClientRect();
          var pinH = Q_PIN_HEIGHT;
          var cx2, cy2;
          if(j === 2){
            cx2 = rect.width - 40 + (Math.random()-0.5)*20;
            cy2 = rect.height - pinH + (Math.random()-0.5)*20;
          } else {
            cx2 = (rect.width/2 - 20) + (Math.random()-0.5)*40;
            cy2 = (rect.height/2 - pinH/2) + (Math.random()-0.5)*40;
          }
          var clampedR = clampQPosition(cx2, cy2, rect.width, rect.height, pinH, zone);
          cx2 = clampedR.x; cy2 = clampedR.y;

          var placed;
          if(fromTray){
            placed = cloneTokenForQuadrant(token);
            if(!placed) return;
            token.classList.remove('selected');
            zone.appendChild(placed);
            hideTrayToken(token.id);
          } else {
            placed = token;
            zone.appendChild(placed);
          }
          placed.style.position = 'absolute';
          placed.style.left = (cx2/rect.width*100)+'%';
          placed.style.top = (cy2/rect.height*100)+'%';
          placed.classList.remove('selected');

          refitQToken(placed);
          bringToFront(placed);
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
      _savedScrollY = window.pageYOffset;
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
        '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.55078 4.5C2.61472 3.84994 2.75923 3.41238 3.08582 3.08579C3.67161 2.5 4.61442 2.5 6.50004 2.5C8.38565 2.5 9.32846 2.5 9.91425 3.08579C10.5 3.67157 10.5 4.61438 10.5 6.5C10.5 8.38562 10.5 9.32843 9.91425 9.91421C9.32846 10.5 8.38565 10.5 6.50004 10.5C4.61442 10.5 3.67161 10.5 3.08582 9.91421C2.77645 9.60484 2.63047 9.19589 2.56158 8.60106"/><path d="M21.4493 15.5C21.3853 14.8499 21.2408 14.4124 20.9142 14.0858C20.3284 13.5 19.3856 13.5 17.5 13.5C15.6144 13.5 14.6716 13.5 14.0858 14.0858C13.5 14.6716 13.5 15.6144 13.5 17.5C13.5 19.3856 13.5 20.3284 14.0858 20.9142C14.6716 21.5 15.6144 21.5 17.5 21.5C19.3856 21.5 20.3284 21.5 20.9142 20.9142C21.2408 20.5876 21.3853 20.1501 21.4493 19.5"/><path d="M2.5 17.5C2.5 15.6144 2.5 14.6716 3.08579 14.0858C3.67157 13.5 4.61438 13.5 6.5 13.5C8.38562 13.5 9.32843 13.5 9.91421 14.0858C10.5 14.6716 10.5 15.6144 10.5 17.5C10.5 19.3856 10.5 20.3284 9.91421 20.9142C9.32843 21.5 8.38562 21.5 6.5 21.5C4.61438 21.5 3.67157 21.5 3.08579 20.9142C2.5 20.3284 2.5 19.3856 2.5 17.5Z"/><path d="M13.5 6.5C13.5 4.61438 13.5 3.67157 14.0858 3.08579C14.6716 2.5 15.6144 2.5 17.5 2.5C19.3856 2.5 20.3284 2.5 20.9142 3.08579C21.5 3.67157 21.5 4.61438 21.5 6.5C21.5 8.38562 21.5 9.32843 20.9142 9.91421C20.3284 10.5 19.3856 10.5 17.5 10.5C15.6144 10.5 14.6716 10.5 14.0858 9.91421C13.5 9.32843 13.5 8.38562 13.5 6.5Z"/></svg>',
        '  <span>Quadrant</span>',
        '</button>',
        '<button class="mode-toggle-btn" data-mode="battles" type="button">',
        '  <img class="mode-toggle-icon" src="icons/tournament-bracket-svgrepo-com.svg" alt="" width="20" height="20" />',
        '  <span>Versus</span>',
        '</button>'
      ].join('');

      // Insert toggle before the prompt stack (top of board)
      var promptStack = boardPanel.querySelector('.prompt-stack-wrap');
      if(promptStack){
        boardPanel.insertBefore(toggleWrap, promptStack);
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

      // Initialize battles mode
      if(typeof initBattles === 'function') initBattles();

      // Start auto-save for quadrant data
      startQuadrantAutoSave();

      // Restore mode from localStorage (but always default to tier)
      var savedMode = null;
      try{ savedMode = localStorage.getItem('tm_mode'); }catch(e){}
      if(savedMode === 'quadrant'){
        setMode('quadrant');
      } else if(savedMode === 'battles'){
        setMode('battles');
      }

      // Enable click-to-place on tray for quadrant mode
      // (Already handled by the shared enableClickToPlace)

      // Expose for other scripts
      window.currentChartMode = function(){ return currentMode; };
      window.setChartMode = setMode;
    }, 50);
  });

  /* Expose globals so script.js keyboard handler can call them */
  window.scheduleQuadrantSave = function(){ scheduleQuadrantSave(); };
  window.refitQToken = function(tok){ refitQToken(tok); };
  window.bringQTokenToFront = function(tok){ bringToFront(tok); };
  window.clampQPosition = function(x,y,w,h,sz,zone){ return clampQPosition(x,y,w,h,sz,zone); };
  window.clearQuadrants = function(){ clearQuadrants(); };
  window.cloneTokenForQuadrant = function(tok){ return cloneTokenForQuadrant(tok); };

})();
