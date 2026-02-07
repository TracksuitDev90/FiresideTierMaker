/* ---------- Polyfills ---------- */
(function () {
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (t, p) {
      t = t >> 0; p = String(p || ' ');
      if (this.length >= t) return String(this);
      t = t - this.length;
      if (t > p.length) p += p.repeat(Math.ceil(t / p.length));
      return p.slice(0, t) + String(this);
    };
  }
  if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      function (s) {
        var m = (this.document || this.ownerDocument).querySelectorAll(s), i = m.length;
        while (--i >= 0 && m.item(i) !== this) {}
        return i > -1;
      };
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      var el = this;
      if (!document.documentElement.contains(el)) return null;
      do { if (el.matches(s)) return el; el = el.parentElement || el.parentNode; }
      while (el && el.nodeType === 1);
      return null;
    };
  }
})();

/* ---------- Event helper ---------- */
var _supportsPassive = false;
try {
  var _opts = Object.defineProperty({}, 'passive', { get: function(){ _supportsPassive = true; } });
  window.addEventListener('x', null, _opts); window.removeEventListener('x', null, _opts);
} catch(e){}
function on(el, t, h, o){ if(!el) return;
  if (!o) { el.addEventListener(t, h, false); return; }
  if (typeof o === 'object' && !_supportsPassive) el.addEventListener(t, h, !!o.capture);
  else el.addEventListener(t, h, o);
}

/* ---------- Utilities ---------- */
var $  = function (s, ctx){ return (ctx||document).querySelector(s); };
var $$ = function (s, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(s)); };
function uid(){ return 'id-' + Math.random().toString(36).slice(2,10); }
function live(msg){ var n=$('#live'); if(!n) return; n.textContent=''; setTimeout(function(){ n.textContent=msg; },0); }
function vib(ms){ if('vibrate' in navigator) navigator.vibrate(ms||8); }
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function isSmall(){ return window.matchMedia && window.matchMedia('(max-width: 768px)').matches; }
function debounce(fn, ms){ var t; return function(){ clearTimeout(t); t=setTimeout(fn, ms); }; }

/* ---------- Color helpers ---------- */
function hexToRgb(hex){ var m=hex.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/); if(m) return {r:parseInt(m[1],10),g:parseInt(m[2],10),b:parseInt(m[3],10)}; var h=hex.replace('#',''); if(h.length===3){ h=h.split('').map(function(x){return x+x;}).join(''); } var n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(function(v){return v.toString(16).padStart(2,'0');}).join(''); }
function relativeLuminance(rgb){ function srgb(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); } return 0.2126*srgb(rgb.r)+0.7152*srgb(rgb.g)+0.0722*srgb(rgb.b); }
function contrastColor(bgHex){ var L=relativeLuminance(hexToRgb(bgHex)); return L>0.179 ? '#000000' : '#ffffff'; }
function darken(hex,p){ var c=hexToRgb(hex); var f=(1-(p||0)); return rgbToHex(Math.round(c.r*f),Math.round(c.g*f),Math.round(c.b*f)); }
function lighten(hex,p){ var c=hexToRgb(hex), f=p||0; return rgbToHex(Math.round(c.r+(255-c.r)*f), Math.round(c.g+(255-c.g)*f), Math.round(c.b+(255-c.b)*f)); }
function mixHex(aHex,bHex,t){ var a=hexToRgb(aHex), b=hexToRgb(bHex);
  return rgbToHex(
    Math.round(a.r+(b.r-a.r)*t),
    Math.round(a.g+(b.g-a.g)*t),
    Math.round(a.b+(b.b-a.b)*t)
  );
}

/* ---------- Theme (button shows TARGET mode) ---------- */
(function(){
  var root=document.documentElement;
  var toggle=$('#themeToggle'); if(!toggle) return;
  var icon=$('.theme-icon',toggle), text=$('.theme-text',toggle);
  var prefersLight=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);
  setTheme(localStorage.getItem('tm_theme') || (prefersLight ? 'light' : 'dark'));
  on(toggle,'click', function(){ setTheme(root.getAttribute('data-theme')==='dark'?'light':'dark'); });
  function setTheme(mode){
    root.setAttribute('data-theme', mode); localStorage.setItem('tm_theme', mode);
    var target = mode==='dark' ? 'Light' : 'Dark';
    if(text) text.textContent = target;
    toggle.setAttribute('aria-pressed', mode==='light' ? 'true' : 'false');
    if(icon) icon.innerHTML = (target==='Light'
      ? '<svg viewBox="0 0 24 24"><path d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79 1.8-1.79zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zM4.22 19.78l1.79-1.79 1.8 1.79-1.8 1.8-1.79-1.8zM20 13h3v-2h-3v2zM12 1h2v3h-2V1zm6.01 3.05l1.79 1.79 1.8-1.79-1.8-1.8-1.79 1.8zM12 6a6 6 0 100 12A6 6 0 0012 6z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>');
    $$('.tier-row').forEach(function(row){
      var chip=$('.label-chip',row), drop=$('.tier-drop',row);
      if (drop && drop.dataset.manual!=='true'){
        drop.style.background = tintFrom(chip && chip.dataset.color ? chip.dataset.color : '#8b7dff');
      }
    });
  }
})();

/* ---------- DOM refs ---------- */
var board=null, tray=null;

/* ---------- FLIP (smooth reflow for token moves) ---------- */
function flipZones(zones, mutate){
  var prev=new Map();
  zones.forEach(function(z){ $$('.token',z).forEach(function(t){ prev.set(t,t.getBoundingClientRect()); }); });
  mutate();
  requestAnimationFrame(function(){
    zones.forEach(function(z){
      $$('.token',z).forEach(function(t){
        var r2=t.getBoundingClientRect(), r1=prev.get(t); if(!r1) return;
        var dx=r1.left-r2.left, dy=r1.top-r2.top;
        if(dx||dy){
          t.classList.add('flip-anim');
          t.style.transform='translate('+dx+'px,'+dy+'px)';
          requestAnimationFrame(function(){
            t.style.transform='translate(0,0)';
            setTimeout(function(){ t.classList.remove('flip-anim'); t.style.transform=''; },220);
          });
        }
      });
    });
  });
}

/* ---------- Build a row ---------- */
function buildRowDom(){
  var row=document.createElement('div'); row.className='tier-row';
  var labelWrap=document.createElement('div'); labelWrap.className='tier-label';

  var chip=document.createElement('div');
  chip.className='label-chip'; chip.setAttribute('contenteditable','true'); chip.setAttribute('spellcheck','false');

  var del=document.createElement('button'); del.className='row-del'; del.type='button';
  del.innerHTML='<svg viewBox="0 0 24 24"><path d="M18.3 5.7L12 12l-6.3-6.3-1.4 1.4L10.6 13.4l-6.3 6.3 1.4 1.4L12 14.4l6.3 6.3 1.4-1.4-6.3-6.3 6.3-6.3z"/></svg>';

  labelWrap.appendChild(chip); labelWrap.appendChild(del);

  var drop=document.createElement('div');
  drop.className='tier-drop dropzone'; drop.setAttribute('tabindex','0'); drop.setAttribute('role','list');

  row.appendChild(labelWrap); row.appendChild(drop);
  return { row: row, chip: chip, del: del, drop: drop, labelWrap: labelWrap };
}

function tintFrom(color){
  var surface = cssVar('--surface') || '#111219';
  var a=hexToRgb(surface), b=hexToRgb(color);
  var dark = document.documentElement.getAttribute('data-theme')!=='light';
  var amt = dark?0.14:0.09;
  return rgbToHex(
    Math.round(a.r+(b.r-a.r)*amt),
    Math.round(a.g+(b.g-a.g)*amt),
    Math.round(a.b+(b.b-a.b)*amt)
  );
}
function ensureId(el, prefix){ if(!el.id){ el.id=(prefix||'id')+'-'+uid(); } return el.id; }
function rowLabel(row){ var chip=row?row.querySelector('.label-chip'):null; return chip?chip.textContent.replace(/\s+/g,' ').trim():'row'; }

/* ---------- Chip label auto-sizer ---------- */
function fitChipLabel(chip){
  if (!chip) return;
  var text = chip.textContent.replace(/\s+/g,' ').trim();
  // Default short labels (1-3 chars) get max size
  if (text.length <= 3) {
    chip.style.fontSize = '';
    return;
  }
  // Longer custom text: shrink to fit, allow wrapping
  var maxPx = 24, minPx = 11;
  chip.style.fontSize = maxPx + 'px';
  for (var px = maxPx; px >= minPx; px--) {
    chip.style.fontSize = px + 'px';
    if (chip.scrollHeight <= chip.clientHeight && chip.scrollWidth <= chip.clientWidth) break;
  }
}

/* ---------- Create / wire a new row ---------- */
function createRow(cfg){
  var dom = buildRowDom();
  var node = dom.row, chip = dom.chip, del = dom.del, drop = dom.drop, labelArea = dom.labelWrap;

  ensureId(drop,'zone');
  chip.textContent = cfg.label;
  chip.dataset.color = cfg.color;
  chip.style.background = cfg.color;
  chip.style.color = '#ffffff'; // Always white text on tier labels
  del.style.background = darken(cfg.color, 0.35);

  var tint = tintFrom(cfg.color);
  drop.style.background = tint; drop.dataset.manual = 'false';

  on(chip,'input', function(){ fitChipLabel(chip); });
  on(chip,'keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); chip.blur(); } });
  on(chip,'blur', function(){ fitChipLabel(chip); });
  fitChipLabel(chip);
  on(del,'click', function(){
    var tokens = $$('.token', drop);
    flipZones([drop,tray], function(){ tokens.forEach(function(t){ tray.appendChild(t); }); });
    node.remove(); refreshRadialOptions();
  });

  enableRowReorder(labelArea, node);
  enableClickToPlace(drop);
  return node;
}

/* ---------- Defaults ---------- */
var defaultTiers = [
  { label:'S', color:'#ff6b6b' },
  { label:'A', color:'#f6c02f' },        // slightly more yellow
  { label:'B', color:'#22c55e' },
  { label:'C', color:'#3b82f6' },
  { label:'D', color:'#a78bfa' }
];

/* Fresh colors for new tiers (avoids default S/A/B/C/D colors) */
var NEW_TIER_COLORS = ['#06b6d4','#e11d48','#16a34a','#f97316','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1','#84cc16','#ef4444'];
function shuffleNewTierColors(){
  for(var i=NEW_TIER_COLORS.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=NEW_TIER_COLORS[i]; NEW_TIER_COLORS[i]=NEW_TIER_COLORS[j]; NEW_TIER_COLORS[j]=tmp; }
}
shuffleNewTierColors();
var tierIdx = 0;
function nextTierColor(){ var c=NEW_TIER_COLORS[tierIdx%NEW_TIER_COLORS.length]; tierIdx++; return c; }

var communityCast = [
  "Anette","Authority","B7","Camryn","Cindy","Clamy","Clay","Cody","Cookies",
  "Denver","Devon","Dexy","Domo","Gavin","Harry","Jeremy","Katie","Kiev","Kikki",
  "Meegan","Mew's","Neil","NJ","Paper","Ray","Raymond","Safoof","Sky","Tubawk","Versse","Xavier"
];

/* ---------- PRE-RENDERED CIRCLE PALETTE (20% less pale) ---------- */
var BASE_PALETTE = [
  '#FFD54F','#FF8A65','#FFB74D','#FFC107',
  '#7986CB','#EF5350','#E91E63','#9575CD',
  '#F48FB1','#4DD0E1','#26C6DA','#FF7043',
  '#FF9800','#FFAB91','#4FC3F7','#7E57C2',
  '#FFCA28','#EF9A9A','#80DEEA','#B39DDB',
  '#81D4FA','#FFCC80','#A5D6A7','#F8BBD0',
  '#FFA726','#66BB6A','#4DB6AC','#FF80AB','#9FA8DA'
];

function contrastForBlack(hex){ var L=relativeLuminance(hexToRgb(hex)); return (L + 0.05) / 0.05; }

/*
  Make colors readable on black text:
  - target contrast: 4.0:1 (readable for bold/large text)
  - after reaching target, pull 10% back toward original to keep vibrancy
  - if that pull drops below target, nudge back up in tiny steps
*/
function ensureForBlack(hex){
  var target = 4.0;
  var safe = hex, steps = 0;
  while (contrastForBlack(safe) < target && steps < 8){
    safe = lighten(safe, 0.03); steps++;
  }
  // pull 10% toward the original to keep vibrancy
  var toned = mixHex(safe, hex, 0.10);
  var guard = 0;
  while (contrastForBlack(toned) < target && guard < 4){
    toned = lighten(toned, 0.01); guard++;
  }
  return toned;
}
/* Fisher-Yates shuffle so tokens get different colors each page load */
function shuffleArray(arr){
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; }
  return arr;
}
var presetPalette = shuffleArray(BASE_PALETTE.map(ensureForBlack));
var pIndex = 0;
function nextPreset(){ var c = presetPalette[pIndex % presetPalette.length]; pIndex++; return c; }

/* ---------- Canvas text measurement (avoids scrollWidth bugs) ---------- */
var _measureCtx = null;
function measureText(text, fontWeight, px){
  if(!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = fontWeight + ' ' + px + 'px ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial';
  return _measureCtx.measureText(text).width;
}

/* ---------- Live label fitter (UI) ---------- */
function fitLiveLabel(lbl){
  if (!lbl) return;
  var token = lbl.parentElement;
  var D = token.clientWidth;
  if (!D) return;
  var pad = 8;
  var maxW = D - pad * 2;
  var text = lbl.textContent;

  var px = 21;
  for (; px >= 10; px--) {
    if (measureText(text, '900', px) <= maxW) break;
  }

  var s = lbl.style;
  s.fontSize = px + 'px';
  s.whiteSpace = 'nowrap';
  s.lineHeight = '1.1';
  s.display = 'flex';
  s.alignItems = 'center';
  s.justifyContent = 'center';
  s.textAlign = 'center';
  s.width = '100%';
  s.height = '100%';
  s.padding = pad + 'px';
  s.overflow = 'hidden';
}
function refitAllLabels(){ $$('.token .label').forEach(fitLiveLabel); }
on(window,'resize', debounce(refitAllLabels, 120));

/* ---------- Tokens ---------- */
function buildTokenBase(isCustom){
  var el = document.createElement('div');
  el.className='token'; el.id = uid(); el.setAttribute('tabindex','0'); el.setAttribute('role','listitem');
  el.style.touchAction='none'; el.setAttribute('draggable','false');
  if (isCustom) el.dataset.custom = 'true';

  // Add delete button for custom tokens
  if (isCustom) {
    var delBtn = document.createElement('button');
    delBtn.className = 'token-del';
    delBtn.type = 'button';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18.3 5.7L12 12l-6.3-6.3-1.4 1.4 6.3 6.3-6.3 6.3 1.4 1.4 6.3-6.3 6.3 6.3 1.4-1.4-6.3-6.3 6.3-6.3z"/></svg>';
    delBtn.setAttribute('aria-label', 'Delete');
    on(delBtn, 'click', function(ev){
      ev.stopPropagation();
      el.remove();
      scheduleSave();
    });
    el.appendChild(delBtn);
  }

  // Attach all drag handlers; each checks isSmall() at event time
  if (window.PointerEvent) enablePointerDrag(el);
  else enableMouseTouchDragFallback(el);
  enableMobileTouchDrag(el);

  on(el,'click', function(ev){
    ev.stopPropagation();
    var already = el.classList.contains('selected');
    $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
    var inTray = !!el.closest('#tray');
    if (!already){
      el.classList.add('selected');
      if (isSmall() && inTray) openRadial(el);
    } else if (isSmall() && inTray){
      closeRadial();
    }
  });
  on(el,'keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.click(); } });
  return el;
}
function buildNameToken(name, color, forceBlack, isCustom){
  var el = buildTokenBase(isCustom);
  el.style.background = color;
  var label = document.createElement('div'); label.className='label'; label.textContent=name;
  label.style.color = forceBlack ? '#111' : contrastColor(color);
  el.appendChild(label);
  fitLiveLabel(label);
  return el;
}
function buildImageToken(src, alt){
  var el = buildTokenBase(true); // images are always custom
  var img = document.createElement('img'); img.src=src; img.alt=alt||''; img.draggable=false; el.appendChild(img);
  return el;
}

/* ---------- History (Undo) ---------- */
var historyStack = []; // {itemId, fromId, toId, originBeforeId}
function recordPlacement(itemId, fromId, toId, originBeforeId){
  if (!fromId || !toId || fromId===toId) return;
  historyStack.push({itemId:itemId, fromId:fromId, toId:toId, originBeforeId: originBeforeId||''});
  var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0;
}
function undoLast(){
  var last = historyStack.pop(); if (!last) return;
  var item = document.getElementById(last.itemId);
  var origin = document.getElementById(last.fromId);
  if (!item || !origin) return;
  flipZones([item.parentElement, origin], function(){
    if (last.originBeforeId){
      var before = document.getElementById(last.originBeforeId);
      if (before && before.parentElement === origin){ origin.insertBefore(item, before); return; }
    }
    origin.appendChild(item);
  });
  $('#undoBtn').disabled = historyStack.length===0;
}

/* ---------- Insert helper (drop between tokens) ---------- */
function insertBeforeForPoint(zone,x,y,except){
  var tokens=[].slice.call(zone.querySelectorAll('.token')).filter(function(t){return t!==except;});
  if(tokens.length===0) return null;
  var centers=tokens.map(function(t){var r=t.getBoundingClientRect();return {t:t,cx:r.left+r.width/2,cy:r.top+r.height/2};});
  var rightMost=centers.reduce(function(a,b){return (b.cx>a.cx)?b:a;});
  var zr=zone.getBoundingClientRect();
  if(x > rightMost.cx + 24) return null;
  if(y > zr.bottom - 12) return null;
  var best=null,bestD=Infinity;
  centers.forEach(function(c){var dx=c.cx-x,dy=c.cy-y;var d=dx*dx+dy*dy;if(d<bestD){bestD=d;best=c.t;}});
  return best;
}

/* ---------- Click-to-place (tray & rows) ---------- */
function enableClickToPlace(zone){
  ensureId(zone,'zone');
  on(zone,'click', function(e){
    var picker=$('#radialPicker'); if(picker && !picker.classList.contains('hidden')) return;
    var selected = $('.token.selected'); if (!selected) return;
    if(isSmall() && !selected.closest('#tray')) return;
    var fromId = ensureId(selected.parentElement,'zone'); if(fromId===zone.id) return;
    var origin = selected.parentElement;
    var originNext = selected.nextElementSibling;
    var originBeforeId = originNext ? ensureId(originNext,'tok') : '';
    flipZones([origin, zone], function(){ zone.appendChild(selected); });
    selected.classList.remove('selected');
    recordPlacement(selected.id, fromId, zone.id, originBeforeId);
    var r = zone.closest ? zone.closest('.tier-row') : null;
    live('Moved "'+(selected.innerText||'item')+'" to '+ (r?rowLabel(r):'Image Storage') );
    vib(6);
  });
}

/* ---------- Zone detection ---------- */
function getDropZoneFromElement(el){
  if (!el) return null;
  var dz=el.closest('.dropzone, #tray'); if(dz) return dz;
  var chip=el.closest('.tier-label'); if(chip){ var row=chip.closest('.tier-row'); return row?row.querySelector('.tier-drop'):null; }
  return null;
}

/* ---------- Pointer drag (desktop / large screens) ---------- */
function enablePointerDrag(node){
  var ghost=null, originParent=null, originNext=null, currentZone=null;
  var offsetX=0, offsetY=0, x=0, y=0, raf=null;

  on(node,'pointerdown', function(e){
    if (isSmall()) return;
    if (e.button!==0) return;
    e.preventDefault();
    node.setPointerCapture(e.pointerId);
    document.body.classList.add('dragging-item');

    originParent = node.parentElement; originNext = node.nextElementSibling;
    var r=node.getBoundingClientRect(); offsetX=e.clientX-r.left; offsetY=e.clientY-r.top; x=e.clientX; y=e.clientY;

    ghost = node.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.appendChild(ghost);
    node.classList.add('drag-hidden');

    function move(ev){ x=ev.clientX; y=ev.clientY; }
    function up(){
      try{ node.releasePointerCapture(e.pointerId); }catch(_){}
      document.removeEventListener('pointermove', move, _supportsPassive?{passive:true}:false);
      document.removeEventListener('pointerup', up, false);
      cancelAnimationFrame(raf);
      var target = document.elementFromPoint(x,y);
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      node.classList.remove('drag-hidden');
      document.body.classList.remove('dragging-item');

      var zone = getDropZoneFromElement(target);
      if (zone){
        var fromId = ensureId(originParent,'zone');
        var toId   = ensureId(zone,'zone');
        var originBeforeId = originNext ? ensureId(originNext,'tok') : '';
        var beforeTok = insertBeforeForPoint(zone,x,y,node);
        flipZones([originParent, zone], function(){
          if(beforeTok) zone.insertBefore(node, beforeTok); else zone.appendChild(node);
        });
        recordPlacement(node.id, fromId, toId, originBeforeId);
        node.classList.add('animate-drop'); setTimeout(function(){ node.classList.remove('animate-drop'); },180);
        var rr = zone.closest ? zone.closest('.tier-row') : null;
        live('Moved "'+(node.innerText||'item')+'" to '+ (rr?rowLabel(rr):'Image Storage') );
        vib(6);
      } else {
        flipZones([originParent], function(){
          if (originNext && originNext.parentElement===originParent) originParent.insertBefore(node, originNext);
          else originParent.appendChild(node);
        });
      }
      if (currentZone) currentZone.classList.remove('drag-over');
      currentZone=null;
    }

    document.addEventListener('pointermove', move, _supportsPassive?{passive:true}:false);
    document.addEventListener('pointerup', up, false);
    loop();

    function loop(){
      raf = requestAnimationFrame(loop);
      ghost.style.transform = 'translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';
      var el = document.elementFromPoint(x,y);
      var zone = getDropZoneFromElement(el);

      if (currentZone && currentZone!==zone) currentZone.classList.remove('drag-over');
      if (zone && zone!==currentZone) zone.classList.add('drag-over');
      currentZone = zone || null;
    }
  });
}

/* ---------- Legacy mouse/touch fallback ---------- */
function enableMouseTouchDragFallback(node){
  var dragging=false, ghost=null, originParent=null, originNext=null, currentZone=null;
  var offsetX=0, offsetY=0, x=0, y=0, raf=null;

  function start(e, clientX, clientY){
    if (isSmall()) return; dragging=true; document.body.classList.add('dragging-item');
    if (e && e.preventDefault) e.preventDefault();

    originParent=node.parentElement; originNext=node.nextElementSibling;
    var r=node.getBoundingClientRect(); offsetX=clientX-r.left; offsetY=clientY-r.top; x=clientX; y=clientY;

    ghost = node.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.appendChild(ghost);
    node.classList.add('drag-hidden'); loop();
  }
  function move(clientX, clientY){ if(!dragging) return; x=clientX; y=clientY; }
  function end(){
    if(!dragging) return; dragging=false;
    cancelAnimationFrame(raf);
    var target=document.elementFromPoint(x,y);
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    node.classList.remove('drag-hidden');
    document.body.classList.remove('dragging-item');
    var zone=getDropZoneFromElement(target);
    if (zone){
      var fromId=ensureId(originParent,'zone'), toId=ensureId(zone,'zone');
      var originBeforeId = originNext ? ensureId(originNext,'tok') : '';
      var beforeTok=insertBeforeForPoint(zone,x,y,node);
      flipZones([originParent, zone], function(){
        if(beforeTok) zone.insertBefore(node,beforeTok); else zone.appendChild(node);
      });
      recordPlacement(node.id, fromId, toId, originBeforeId);
      node.classList.add('animate-drop'); setTimeout(function(){ node.classList.remove('animate-drop'); },180);
      var rr = zone.closest ? zone.closest('.tier-row') : null;
      live('Moved "'+(node.innerText||'item')+'" to '+ (rr?rowLabel(rr):'Image Storage') );
      vib(6);
    } else {
      flipZones([originParent], function(){
        if (originNext && originNext.parentElement===originParent) originParent.insertBefore(node, originNext);
        else originParent.appendChild(node);
      });
    }
    if (currentZone) currentZone.classList.remove('drag-over');
    currentZone=null;
  }

  on(node,'mousedown', function(e){ if(e.button!==0) return; start(e,e.clientX,e.clientY);
    on(document,'mousemove', onMouseMove); on(document,'mouseup', onMouseUp); });
  function onMouseMove(e){ move(e.clientX,e.clientY); }
  function onMouseUp(){ document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); end(); }

  on(node,'touchstart', function(e){ var t=e.touches[0]; start(e,t.clientX,t.clientY);
    on(document,'touchmove', onTouchMove, _supportsPassive?{passive:true}:false);
    on(document,'touchend', onTouchEnd, false); }, _supportsPassive?{passive:false}:false);
  function onTouchMove(e){ var t=e.touches[0]; if(t) move(t.clientX,t.clientY); }
  function onTouchEnd(){ document.removeEventListener('touchmove', onTouchMove, false); document.removeEventListener('touchend', onTouchEnd, false); end(); }

  function loop(){
    raf=requestAnimationFrame(loop);
    ghost.style.transform='translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';
    var el=document.elementFromPoint(x,y);
    var zone=getDropZoneFromElement(el);
    if (currentZone && currentZone!==zone) currentZone.classList.remove('drag-over');
    if (zone && zone!==currentZone) zone.classList.add('drag-over');
    currentZone = zone || null;
  }
}

/* ---------- Mobile touch drag for placed tokens ---------- */
function enableMobileTouchDrag(node){
  if(!('PointerEvent' in window)) return;
  on(node,'pointerdown',function(e){
    if(!isSmall())return;
    if(e.pointerType!=='touch' && e.pointerType!=='pen')return;
    if(!node.closest('.tier-drop'))return;
    e.preventDefault(); node.setPointerCapture(e.pointerId); document.body.classList.add('dragging-item');

    var ghost=node.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.appendChild(ghost);
    var originParent=node.parentElement, originNext=node.nextElementSibling;

    // Show a placeholder gap where the token was, and enable smooth sibling animation
    node.classList.add('drag-hidden');
    originParent.classList.add('reorder-active');

    var r=node.getBoundingClientRect(), offsetX=e.clientX-r.left, offsetY=e.clientY-r.top, x=e.clientX, y=e.clientY;
    var lastInsertZone=null, lastInsertBefore=null, moved=false;

    function move(ev){
      x=ev.clientX; y=ev.clientY;
      ghost.style.transform='translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';

      // Hit-test through the ghost
      ghost.style.pointerEvents='none';
      var el=document.elementFromPoint(x,y);
      ghost.style.pointerEvents='';
      var zone=el?getDropZoneFromElement(el):null;
      if(zone){
        // Enable reorder-active on new zone too
        if(zone!==lastInsertZone){
          if(lastInsertZone) lastInsertZone.classList.remove('reorder-active');
          zone.classList.add('reorder-active');
        }
        var beforeTok=insertBeforeForPoint(zone,x,y,node);
        if(zone!==lastInsertZone || beforeTok!==lastInsertBefore){
          if(beforeTok) zone.insertBefore(node,beforeTok); else zone.appendChild(node);
          lastInsertZone=zone; lastInsertBefore=beforeTok;
          vib(4);
        }
      }
    }
    function up(){
      try{node.releasePointerCapture(e.pointerId);}catch(_){}
      document.removeEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
      document.removeEventListener('pointerup',up,false);
      if(ghost&&ghost.parentNode)ghost.parentNode.removeChild(ghost);
      node.classList.remove('drag-hidden');
      document.body.classList.remove('dragging-item');

      // Clean up reorder-active from all zones
      $$('.reorder-active').forEach(function(z){ z.classList.remove('reorder-active'); });

      // Token is already at its new position from live preview
      var currentParent=node.parentElement;
      if(currentParent && currentParent!==originParent){
        var fromId=ensureId(originParent,'zone'), toId=ensureId(currentParent,'zone');
        var originBeforeId=originNext?ensureId(originNext,'tok'):'';
        recordPlacement(node.id,fromId,toId,originBeforeId);
        moved=true;
      } else if(currentParent===originParent && node.nextElementSibling!==originNext){
        var fromId2=ensureId(originParent,'zone');
        var originBeforeId2=originNext?ensureId(originNext,'tok'):'';
        recordPlacement(node.id,fromId2,fromId2,originBeforeId2);
        moved=true;
      }
      if(moved){
        node.classList.add('animate-drop'); setTimeout(function(){node.classList.remove('animate-drop');},180);
        var rr=node.closest('.tier-row'); live('Moved "'+(node.innerText||'item')+'" to '+(rr?rowLabel(rr):'Image Storage'));
        vib(6);
      } else {
        if(originNext&&originNext.parentElement===originParent)originParent.insertBefore(node,originNext);
        else originParent.appendChild(node);
      }
    }
    document.addEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
    document.addEventListener('pointerup',up,false);
  },_supportsPassive?{passive:false}:false);
}

/* ---------- Row reorder ---------- */
var _rowPlaceholder = null;
var _rowDragoverAttached = false;

function _rowAfterY(container, y){
  var rows = Array.prototype.filter.call(container.querySelectorAll('.tier-row'), function(r){ return r!==_rowPlaceholder && r.style.display!=='none'; });
  for (var i=0;i<rows.length;i++){ var r=rows[i], rect=r.getBoundingClientRect(); if (y < rect.top + rect.height/2) return r; }
  return null;
}

function enableRowReorder(labelArea, row){
  function arm(e){
    var chip=$('.label-chip',row); if(document.activeElement===chip) return;
    if (isSmall() && (('ontouchstart' in window)||navigator.maxTouchPoints>0)) return;
    row.setAttribute('draggable','true');
  }
  on(labelArea,'mousedown', arm);
  on(labelArea,'touchstart', arm, _supportsPassive?{passive:true}:false);

  on(row,'dragstart', function(){
    document.body.classList.add('dragging-item');
    _rowPlaceholder = document.createElement('div');
    _rowPlaceholder.className='tier-row';
    _rowPlaceholder.style.height = row.getBoundingClientRect().height+'px';
    _rowPlaceholder.style.borderRadius='12px';
    _rowPlaceholder.style.border='2px dashed rgba(139,125,255,.25)';
    board.insertBefore(_rowPlaceholder, row.nextSibling);
    setTimeout(function(){ row.style.display='none'; },0);
  });
  on(row,'dragend', function(){
    row.style.display='';
    if (_rowPlaceholder && _rowPlaceholder.parentNode){ board.insertBefore(row, _rowPlaceholder); _rowPlaceholder.parentNode.removeChild(_rowPlaceholder); }
    row.removeAttribute('draggable'); _rowPlaceholder=null;
    document.body.classList.remove('dragging-item');
  });

  // Attach dragover listener only once
  if (!_rowDragoverAttached && board) {
    on(board,'dragover', function(e){
      if(!_rowPlaceholder) return; e.preventDefault();
      var after = _rowAfterY(board, e.clientY);
      if (after) board.insertBefore(_rowPlaceholder, after); else board.appendChild(_rowPlaceholder);
    });
    _rowDragoverAttached = true;
  }
}

/* ---------- Radial picker (mobile) ---------- */
var radial = $('#radialPicker');
var radialOpts = radial?$('.radial-options', radial):null;
var radialHighlight = radial?$('.radial-highlight', radial):null;
var radialCloseBtn = radial?$('.radial-close', radial):null;
var radialForToken = null;
var _radialGeo = [];
var _savedScrollY = null;

function rowCount(){ return $$('.tier-row').length; }
function refreshRadialOptions(){
  if (!isSmall() || !radial || !radialForToken) return;
  openRadial(radialForToken);
}

function openRadial(token){
  if(!radial||!isSmall()) return;
  // Remove existing backdrop handler to prevent listener leaks on re-open
  if(radial._backdropHandler){
    radial.removeEventListener('pointerdown', radial._backdropHandler);
    delete radial._backdropHandler;
  }
  radialForToken = token;

  // Save scroll position to prevent drift
  if (_savedScrollY === null) _savedScrollY = window.pageYOffset;

  var rows = $$('.tier-row');
  var labels = rows.map(function(r){ return rowLabel(r); });
  var colors = rows.map(function(r){
    var chip = r.querySelector('.label-chip');
    return chip ? chip.dataset.color : '#8b7dff';
  });
  var N = labels.length; if (!N) return;

  // Fixed center of screen — no dependency on token position
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var cx = vw / 2;
  var cy = vh / 2;

  // Layout: evenly spaced buttons in a vertical list centered on screen
  var BTN_H = 52, GAP = 10;
  var totalH = N * BTN_H + (N - 1) * GAP;
  var startY = cy - totalH / 2;

  _radialGeo = [];

  radialCloseBtn.style.left = cx + 'px';
  radialCloseBtn.style.top  = (startY + totalH + GAP + 26) + 'px';

  radialOpts.innerHTML = '';
  for (var j = 0; j < N; j++){
    (function(j){
      var row = rows[j];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'radial-option radial-btn';
      btn.style.left = cx + 'px';
      btn.style.top  = (startY + j * (BTN_H + GAP) + BTN_H / 2) + 'px';
      btn.style.transitionDelay = (j * 20) + 'ms';

      var dot = document.createElement('span');
      dot.className = 'dot';
      dot.textContent = labels[j];
      dot.style.background = colors[j];
      dot.style.color = contrastColor(colors[j]);
      btn.appendChild(dot);

      function makeHot(){ updateHighlight(j); }
      on(btn, 'pointerenter', makeHot);
      on(btn, 'pointerdown', function(e){ e.preventDefault(); makeHot(); });
      on(btn, 'click', function(){ selectRadialTarget(row); });

      radialOpts.appendChild(btn);
      _radialGeo.push({ row: row, btn: btn });
    })(j);
  }

  function backdrop(ev){
    if(ev.target.closest('.radial-option') || ev.target.closest('.radial-close')) return;
    var x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
    var y = (ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY);
    var prevPE = radial.style.pointerEvents; radial.style.pointerEvents = 'none';
    var under = document.elementFromPoint(x, y); radial.style.pointerEvents = prevPE || 'auto';
    var other = under && under.closest && under.closest('#tray .token');
    if(other){
      closeRadial();
      $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
      other.classList.add('selected');
      openRadial(other);
      ev.preventDefault();
      return;
    }
    closeRadial();
  }
  radial.addEventListener('pointerdown', backdrop, {passive: false});
  radial._backdropHandler = backdrop;

  // Lock body scroll to prevent iOS background scrolling
  document.body.style.top = '-' + (_savedScrollY || 0) + 'px';
  document.body.classList.add('radial-open');

  radial.classList.remove('hidden');
  radial.classList.add('visible', 'show');
  radial.setAttribute('aria-hidden', 'false');
  setTimeout(function(){ radial.classList.remove('show'); }, 160 + N * 20);
  if (_radialGeo.length) updateHighlight(0);
}
function updateHighlight(index){
  if(!_radialGeo.length) return;
  for(var i = 0; i < _radialGeo.length; i++){
    _radialGeo[i].btn.classList.toggle('is-hot', i === index);
  }
  if(radialHighlight){ radialHighlight.hidden = true; radialHighlight.dataset.index = String(index); }
}
if(radialCloseBtn){
  on(radialCloseBtn, 'click', function(e){ e.stopPropagation(); closeRadial(); }, false);
}
function selectRadialTarget(row){
  if (!radialForToken || !row) return;
  var zone = row.querySelector('.tier-drop');
  var fromId = ensureId(radialForToken.parentElement, 'zone');
  var origin = radialForToken.parentElement; ensureId(zone, 'zone');
  var originNext = radialForToken.nextElementSibling;
  var originBeforeId = originNext ? ensureId(originNext, 'tok') : '';
  flipZones([origin, zone], function(){ zone.appendChild(radialForToken); });
  radialForToken.classList.remove('selected');
  recordPlacement(radialForToken.id, fromId, zone.id, originBeforeId);
  vib(7);
  closeRadial();
}
function closeRadial(){
  if(!radial) return;
  if(radial._backdropHandler){ radial.removeEventListener('pointerdown', radial._backdropHandler); delete radial._backdropHandler; }
  radial.classList.add('hidden');
  radial.classList.remove('visible', 'show');
  radial.setAttribute('aria-hidden', 'true');
  radialForToken = null;
  _radialGeo = [];
  // Unlock body scroll and restore position
  document.body.classList.remove('radial-open');
  document.body.style.top = '';
  if (_savedScrollY !== null){
    window.scrollTo(0, _savedScrollY);
    _savedScrollY = null;
  }
}
on(window, 'resize', refreshRadialOptions);

/* ---------- Clear / Undo ---------- */
on($('#trashClear'),'click', function(){
  if (!confirm('Reset everything? This will restore the tier list to its original state.')) return;
  // Clear saved data and reload for a fresh start
  try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
  location.reload();
});
on($('#undoBtn'),'click', function(){ undoLast(); });

/* ===== Save Image (keeps on-screen circle size) ===== */
on($('#saveBtn'),'click', function(){
  $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
  $$('.dropzone.drag-over').forEach(function(z){ z.classList.remove('drag-over'); });

  var panel = $('#boardPanel');

  var cloneWrap = document.createElement('div');
  cloneWrap.style.position='fixed'; cloneWrap.style.left='-99999px'; cloneWrap.style.top='0';

  var clone = panel.cloneNode(true);
  clone.style.width = '1200px';
  clone.style.maxWidth = '1200px';

  // Export styles: hide delete buttons, center labels using absolute positioning (most reliable for html2canvas)
  var style = document.createElement('style');
  style.textContent = [
    '.row-del{ display:none !important; }',
    '.token-del{ display:none !important; }',
    // Token container - relative positioning for absolute child
    '.token{',
    '  position:relative !important;',
    '  width:110px !important;',
    '  height:110px !important;',
    '}',
    // Token label - absolute center using transform
    '.token .label{',
    '  position:absolute !important;',
    '  top:50% !important;',
    '  left:50% !important;',
    '  transform:translate(-50%,-50%) !important;',
    '  width:100px !important;',
    '  text-align:center !important;',
    '  font-weight:900 !important;',
    '  text-shadow:none !important;',
    '  white-space:nowrap !important;',
    '  display:block !important;',
    '  padding:0 !important;',
    '  margin:0 !important;',
    '}',
    // Tier label container - relative positioning
    '.tier-label{',
    '  position:relative !important;',
    '  width:100% !important;',
    '  height:100% !important;',
    '}',
    // Tier label chip - absolute center using transform
    '.label-chip{',
    '  position:absolute !important;',
    '  top:50% !important;',
    '  left:50% !important;',
    '  transform:translate(-50%,-50%) !important;',
    '  width:calc(100% - 20px) !important;',
    '  text-align:center !important;',
    '  color:#ffffff !important;',
    '  display:block !important;',
    '}',
    '.board-title-wrap{ text-align:center !important; margin-bottom:20px !important; }',
    '.board-title{ text-align:center !important; font-size:28px !important; }',
    '.title-pen{ display:none !important; }'
  ].join('\n');
  clone.appendChild(style);

  // drop empty title for export — strip if user hasn't typed anything
  var title = clone.querySelector('.board-title');
  var titleText = title ? title.textContent.replace(/\s+/g,'') : '';
  if (!titleText) {
    var wrap = title ? title.parentElement : null;
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  cloneWrap.appendChild(clone);
  document.body.appendChild(cloneWrap);

  // Size each label to fit on single line (canvas measurement for accuracy)
  var cloneLabels = $$('.token .label', clone);
  cloneLabels.forEach(function(lbl){
    var text = lbl.textContent;
    var maxW = 100; // token width with small margin
    var px = 25; // start at 25px for bold readable export
    for (; px >= 10; px--) {
      if (measureText(text, '900', px) <= maxW) break;
    }
    lbl.style.fontSize = px + 'px';
  });

  if (typeof html2canvas !== 'function') {
    cloneWrap.remove();
    showSaveToast('Export library failed to load — check your connection');
    return;
  }
  html2canvas(clone, {
    backgroundColor: cssVar('--surface') || null,
    useCORS: true,
    scale: 2,
    width: 1200,
    windowWidth: 1200
  }).then(function(canvas){
    var a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download='tier-list.png';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); }, 300);
    cloneWrap.remove();
    showSaveToast('Saved!');
  }).catch(function(err){
    cloneWrap.remove();
    showSaveToast('Export failed — try again');
    console.error('PNG export error:', err);
  });
});

/* ---------- Save toast feedback ---------- */
function showSaveToast(msg){
  var existing = $('#saveToast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'saveToast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);animation:toast-in .25s ease';
  document.body.appendChild(toast);
  setTimeout(function(){ toast.remove(); }, 2200);
}

/* ---------- Keyboard quick-jump (1..N) ---------- */
on(document,'keydown',function(e){
  var selected=$('.token.selected'); if(!selected) return;
  var n=parseInt(e.key,10); if(!isNaN(n)&&n>=1&&n<=rowCount()){
    e.preventDefault(); var rows=$$('.tier-row'); var row=rows[n-1]; if(!row) return;
    var zone=row.querySelector('.tier-drop'); var fromId=ensureId(selected.parentElement,'zone');
    var origin=selected.parentElement; ensureId(zone,'zone');
    var kbNext=selected.nextElementSibling;
    var kbBeforeId=kbNext?ensureId(kbNext,'tok'):'';
    flipZones([origin, zone], function(){ zone.appendChild(selected); });
    selected.classList.remove('selected');
    recordPlacement(selected.id,fromId,zone.id,kbBeforeId); vib(4); live('Moved "'+(selected.innerText||'item')+'" to '+rowLabel(row));
  }
});

/* ---------- Image compression for uploads ---------- */
function compressImage(file, maxSize, callback){
  var img = new Image();
  var blobUrl = URL.createObjectURL(file);
  img.onload = function(){
    URL.revokeObjectURL(blobUrl); // Free memory
    var w = img.width, h = img.height;
    if (w <= maxSize && h <= maxSize) {
      // Already small enough, just read as-is
      var reader = new FileReader();
      reader.onload = function(ev){ callback(ev.target.result); };
      reader.onerror = function(){ callback(null); };
      reader.readAsDataURL(file);
      return;
    }
    // Scale down
    var scale = maxSize / Math.max(w, h);
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    callback(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = function(){ URL.revokeObjectURL(blobUrl); callback(null); };
  img.src = blobUrl;
}

/* ---------- LocalStorage persistence ---------- */
var STORAGE_KEY = 'tm_tierlist';

function saveTierList(){
  var data = { rows: [], tray: [], title: '' };
  // Save title
  var titleEl = $('.board-title');
  if (titleEl) data.title = titleEl.textContent || '';
  // Save rows
  $$('.tier-row').forEach(function(row){
    var chip = row.querySelector('.label-chip');
    var drop = row.querySelector('.tier-drop');
    var rowData = {
      label: chip ? chip.textContent : '',
      color: chip ? chip.dataset.color : '#ff6b6b',
      tokens: []
    };
    $$('.token', drop).forEach(function(tok){
      var lbl = tok.querySelector('.label');
      var img = tok.querySelector('img');
      var isCustom = tok.dataset.custom === 'true';
      if (lbl) {
        rowData.tokens.push({ type: 'name', name: lbl.textContent, color: tok.style.background, textColor: lbl.style.color, custom: isCustom });
      } else if (img) {
        rowData.tokens.push({ type: 'image', src: img.src, alt: img.alt, custom: true });
      }
    });
    data.rows.push(rowData);
  });
  // Save tray
  $$('.token', tray).forEach(function(tok){
    var lbl = tok.querySelector('.label');
    var img = tok.querySelector('img');
    var isCustom = tok.dataset.custom === 'true';
    if (lbl) {
      data.tray.push({ type: 'name', name: lbl.textContent, color: tok.style.background, textColor: lbl.style.color, custom: isCustom });
    } else if (img) {
      data.tray.push({ type: 'image', src: img.src, alt: img.alt, custom: true });
    }
  });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e){}
}

function loadTierList(){
  try {
    var json = localStorage.getItem(STORAGE_KEY);
    if (!json) return false;
    var data = JSON.parse(json);
    if (!data || !data.rows) return false;
    // Restore title
    var titleEl = $('.board-title');
    if (titleEl && data.title) titleEl.textContent = data.title;
    // Clear default rows and tray
    board.innerHTML = '';
    tray.innerHTML = '';
    // Restore rows
    data.rows.forEach(function(rowData){
      var node = createRow({ label: rowData.label, color: rowData.color });
      var drop = node.querySelector('.tier-drop');
      rowData.tokens.forEach(function(tokData){
        if (tokData.type === 'name') {
          var tok = buildNameToken(tokData.name, tokData.color || '#7da7ff', false, !!tokData.custom);
          var lbl = tok.querySelector('.label');
          if (lbl && tokData.textColor) lbl.style.color = tokData.textColor;
          drop.appendChild(tok);
        } else if (tokData.type === 'image') {
          drop.appendChild(buildImageToken(tokData.src, tokData.alt));
        }
      });
      board.appendChild(node);
    });
    // Restore tray
    data.tray.forEach(function(tokData){
      if (tokData.type === 'name') {
        var tok = buildNameToken(tokData.name, tokData.color || '#7da7ff', false, !!tokData.custom);
        var lbl = tok.querySelector('.label');
        if (lbl && tokData.textColor) lbl.style.color = tokData.textColor;
        tray.appendChild(tok);
      } else if (tokData.type === 'image') {
        tray.appendChild(buildImageToken(tokData.src, tokData.alt));
      }
    });
    return true;
  } catch(e){ return false; }
}

// Auto-save on changes (debounced)
var _saveTimeout = null;
function scheduleSave(){
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(saveTierList, 800);
}

// Hook into mutations for auto-save
var _saveObserver = null;
function startAutoSave(){
  if (_saveObserver) return;
  _saveObserver = new MutationObserver(scheduleSave);
  _saveObserver.observe(board, { childList: true, subtree: true, characterData: true });
  _saveObserver.observe(tray, { childList: true, subtree: true });
  var titleEl = $('.board-title');
  if (titleEl) {
    on(titleEl, 'input', scheduleSave);
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', function start(){
  board = $('#tierBoard'); tray = $('#tray');

  // Initialize color picker to a preset color (not black)
  var colorPicker = $('#nameColor');
  if (colorPicker) colorPicker.value = nextPreset();

  // Try to restore saved tier list, otherwise use defaults
  var restored = loadTierList();
  if (!restored) {
    // rows
    defaultTiers.forEach(function(t){ board.appendChild(createRow(t)); });
    // tray defaults (pre-rendered with black labels, not custom)
    communityCast.forEach(function(n){ tray.appendChild(buildNameToken(n, nextPreset(), true, false)); });
  }

  // Start auto-save after initial load
  startAutoSave();

  // add tier
  on($('#addTierBtn'),'click', function(){
    board.appendChild(createRow({label:'NEW', color: nextTierColor()}));
    refreshRadialOptions();
    scheduleSave();
  });

  // creators
  function addNameFromInput(){
    var name = $('#nameInput').value.trim();
    if (!name) return;
    tray.appendChild(buildNameToken(name, $('#nameColor').value, false, true)); // custom=true
    $('#nameInput').value=''; $('#nameColor').value = nextPreset();
    refitAllLabels();
    scheduleSave();
  }
  on($('#addNameBtn'),'click', addNameFromInput);
  // Enter key submits name (item 7)
  on($('#nameInput'),'keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); addNameFromInput(); }
  });

  // Wire upload button (moved from inline onclick)
  on($('#uploadBtn'),'click', function(){ $('#imageInput').click(); });

  // Image upload with compression
  on($('#imageInput'),'change', function(e){
    Array.prototype.forEach.call(e.target.files, function(file){
      if(!file.type || file.type.indexOf('image/')!==0) return;
      compressImage(file, 200, function(dataUrl){
        if (dataUrl) {
          tray.appendChild(buildImageToken(dataUrl, file.name));
          scheduleSave();
        }
      });
    });
    e.target.value = ''; // Reset so same file can be uploaded again
  });

  // Help copy (updated to mention editable title)
  var help=$('#helpText') || $('.help');
  if(help){
    help.innerHTML =
      '<strong>Help</strong><br>' +
      (isSmall()
       ? 'Phone: tap a circle in Image Storage to choose a row. Once placed, drag to reorder or move back.'
       : 'Desktop/iPad: drag circles into rows. Reorder or drag back to Image Storage.') +
      ' Tap the X on a tier label to delete that row.<br>Click the title above the board to customize it.';
  }

  enableClickToPlace(tray);
  refitAllLabels();
  live('Ready.');
});
