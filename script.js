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
function hexToRgb(hex){ var h=hex.replace('#',''); if(h.length===3){ h=h.split('').map(function(x){return x+x;}).join(''); } var n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(function(v){return v.toString(16).padStart(2,'0');}).join(''); }
function relativeLuminance(rgb){ function srgb(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); } return 0.2126*srgb(rgb.r)+0.7152*srgb(rgb.g)+0.0722*srgb(rgb.b); }
function contrastColor(bgHex){ var L=relativeLuminance(hexToRgb(bgHex)); return L>0.58 ? '#000000' : '#ffffff'; }
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
  drop.className='tier-drop dropzone'; drop.setAttribute('tabindex','0');

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

/* ---------- Create / wire a new row ---------- */
function createRow(cfg){
  var dom = buildRowDom();
  var node = dom.row, chip = dom.chip, del = dom.del, drop = dom.drop, labelArea = dom.labelWrap;

  ensureId(drop,'zone');
  chip.textContent = cfg.label;
  chip.dataset.color = cfg.color;
  chip.style.background = cfg.color;
  chip.style.color = contrastColor(cfg.color);
  del.style.background = darken(cfg.color, 0.35);

  var tint = tintFrom(cfg.color);
  drop.style.background = tint; drop.dataset.manual = 'false';

  on(chip,'keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); chip.blur(); } });
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

/* Bright cycle for new tiers (no repeats quickly) */
var TIER_CYCLE = ['#ff6b6b','#f6c02f','#22c55e','#3b82f6','#a78bfa','#06b6d4','#e11d48','#16a34a','#f97316','#0ea5e9'];
var tierIdx = 0; function nextTierColor(){ var c=TIER_CYCLE[tierIdx%TIER_CYCLE.length]; tierIdx++; return c; }

/* Pre-rendered creators (added Kikki, Tems, TomTom) */
var communityCast = [
  "Anette","Authority","B7","Cindy","Clamy","Clay","Cody","Denver","Devon","Dexy","Domo",
  "Gavin","Harry","Jay","Jeremy","Katie","Keyon","Kiev","Kikki","Kyle","Lewis","Meegan",
  "Munch","Paper","Ray","Safoof","Temz","TomTom","V","Versse","Wobbles","Xavier"
];

/* ---------- PRE-RENDERED CIRCLE PALETTE (20% less pale) ---------- */
var BASE_PALETTE = [
  '#FCE38A','#F3A683','#F5CD7A','#F7D794',
  '#778BEB','#EB8688','#CF6A87','#786FA6',
  '#F8A5C2','#64CDDB','#3EC1D3','#E77F67',
  '#FA991C','#FAD4C9','#7FC4D4','#A7B3E9',
  '#FBD78B','#EFA7A7','#9FD8DF','#C8B6FF',
  '#B8E1FF','#FFD6A5','#C3F0CA','#FFE5EC',
  '#F4B942','#9EE493','#8AC6D1','#FF8FAB','#B0A8F0'
];

function contrastForBlack(hex){ var L=relativeLuminance(hexToRgb(hex)); return (L + 0.05) / 0.05; }

/* 
  Make colors readable on black text with LESS lightening:
  - target contrast: 4.2:1 (still very readable for bold/large)
  - after reaching target, pull 20% back toward the original base (less pale)
  - if that pull drops below target, nudge back up in tiny steps
*/
function ensureForBlack(hex){
  var target = 4.2;
  var safe = hex, steps = 0;
  while (contrastForBlack(safe) < target && steps < 8){
    safe = lighten(safe, 0.03); steps++;
  }
  // pull 20% toward the original (darker) to reduce paleness
  var toned = mixHex(safe, hex, 0.20);
  var guard = 0;
  while (contrastForBlack(toned) < target && guard < 4){
    toned = lighten(toned, 0.01); guard++;
  }
  return toned;
}
var presetPalette = BASE_PALETTE.map(ensureForBlack);
var pIndex = 0;
function nextPreset(){ var c = presetPalette[pIndex % presetPalette.length]; pIndex++; return c; }

/* ---------- Live label fitter (UI) ---------- */
function fitLiveLabel(lbl){
  if (!lbl) return;
  var token = lbl.parentElement;
  var D = token.clientWidth;
  var pad = 10;

  var s = lbl.style;
  s.whiteSpace = 'nowrap';
  s.lineHeight = '1';
  s.display = 'flex';
  s.alignItems = 'center';
  s.justifyContent = 'center';
  s.height = '100%';
  s.padding = '0 ' + pad + 'px';
  s.wordBreak = 'normal';
  s.hyphens = 'none';
  s.overflow = 'hidden';

  var lo = Math.max(12, Math.floor(D * 0.18));
  var hi = Math.floor(D * 0.44);
  var best = lo;

  function fits(px){
    s.fontSize = px + 'px';
    return (lbl.scrollWidth <= D - pad * 2) && (lbl.scrollHeight <= D - pad * 2);
  }
  while (lo <= hi){
    var mid = (lo + hi) >> 1;
    if (fits(mid)) { best = mid; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  s.fontSize = best + 'px';
}
function refitAllLabels(){ $$('.token .label').forEach(fitLiveLabel); }
on(window,'resize', debounce(refitAllLabels, 120));

/* ---------- Tokens ---------- */
function buildTokenBase(){
  var el = document.createElement('div');
  el.className='token'; el.id = uid(); el.setAttribute('tabindex','0'); el.setAttribute('role','listitem');
  el.style.touchAction='none'; el.setAttribute('draggable','false');

  if (!isSmall()){
    if (window.PointerEvent) enablePointerDrag(el);
    else enableMouseTouchDragFallback(el);
  }else{
    enableMobileTouchDrag(el);
  }

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
function buildNameToken(name, color, forceBlack){
  var el = buildTokenBase();
  el.style.background = color;
  var label = document.createElement('div'); label.className='label'; label.textContent=name;
  label.style.color = forceBlack ? '#111' : contrastColor(color);
  el.appendChild(label);
  fitLiveLabel(label);
  return el;
}
function buildImageToken(src, alt){
  var el = buildTokenBase();
  var img = document.createElement('img'); img.src=src; img.alt=alt||''; img.draggable=false; el.appendChild(img);
  return el;
}

/* ---------- History (Undo) ---------- */
var historyStack = []; // {itemId, fromId, toId, beforeId}
function recordPlacement(itemId, fromId, toId, beforeId){
  if (!fromId || !toId || fromId===toId) return;
  historyStack.push({itemId:itemId, fromId:fromId, toId:toId, beforeId: beforeId||''});
  var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0;
}
function performMove(itemId, parentId, beforeId){
  var item = document.getElementById(itemId);
  var parent = document.getElementById(parentId);
  if (!item || !parent) return;
  flipZones([item.parentElement, parent], function(){
    if (beforeId){
      var before = document.getElementById(beforeId);
      if (before && before.parentElement === parent){ parent.insertBefore(item, before); return; }
    }
    parent.appendChild(item);
  });
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
    flipZones([origin, zone], function(){ zone.appendChild(selected); });
    selected.classList.remove('selected');
    recordPlacement(selected.id, fromId, zone.id);
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
        var beforeTok = insertBeforeForPoint(zone,x,y,node);
        var beforeId = beforeTok ? ensureId(beforeTok,'tok') : '';
        flipZones([originParent, zone], function(){
          if(beforeTok) zone.insertBefore(node, beforeTok); else zone.appendChild(node);
        });
        recordPlacement(node.id, fromId, toId, beforeId);
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
      var beforeTok=insertBeforeForPoint(zone,x,y,node);
      var beforeId = beforeTok ? ensureId(beforeTok,'tok') : '';
      flipZones([originParent, zone], function(){
        if(beforeTok) zone.insertBefore(node,beforeTok); else zone.appendChild(node);
      });
      recordPlacement(node.id, fromId, toId, beforeId);
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
    on(document,'touchend', onTouchEnd, false); }, _supportsPassive?{passive:true}:false);
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
    node.classList.add('drag-hidden');

    var r=node.getBoundingClientRect(), offsetX=e.clientX-r.left, offsetY=e.clientY-r.top, x=e.clientX, y=e.clientY;

    function move(ev){x=ev.clientX;y=ev.clientY; ghost.style.transform='translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';}
    function up(){
      try{node.releasePointerCapture(e.pointerId);}catch(_){}
      document.removeEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
      document.removeEventListener('pointerup',up,false);
      if(ghost&&ghost.parentNode)ghost.parentNode.removeChild(ghost);
      node.classList.remove('drag-hidden'); document.body.classList.remove('dragging-item');

      var target=document.elementFromPoint(x,y); var zone=getDropZoneFromElement(target);
      if(zone){
        var fromId=ensureId(originParent,'zone'), toId=ensureId(zone,'zone');
        var beforeTok=insertBeforeForPoint(zone,x,y,node);
        var beforeId=beforeTok?ensureId(beforeTok,'tok'):'';
        flipZones([originParent, zone], function(){
          if(beforeTok)zone.insertBefore(node,beforeTok); else zone.appendChild(node);
        });
        recordPlacement(node.id,fromId,toId,beforeId);
        node.classList.add('animate-drop'); setTimeout(function(){node.classList.remove('animate-drop');},180);
        var rr=zone.closest?zone.closest('.tier-row'):null; live('Moved "'+(node.innerText||'item')+'" to '+(rr?rowLabel(rr):'Image Storage'));
        vib(6);
      } else {
        flipZones([originParent], function(){
          if(originNext&&originNext.parentElement===originParent)originParent.insertBefore(node,originNext);
          else originParent.appendChild(node);
        });
      }
    }
    document.addEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
    document.addEventListener('pointerup',up,false);
  },_supportsPassive?{passive:false}:false);
}

/* ---------- Row reorder ---------- */
function enableRowReorder(labelArea, row){
  var placeholder=null;
  function arm(e){
    var chip=$('.label-chip',row); if(document.activeElement===chip) return;
    if (isSmall() && (('ontouchstart' in window)||navigator.maxTouchPoints>0)) return;
    row.setAttribute('draggable','true');
  }
  on(labelArea,'mousedown', arm);
  on(labelArea,'touchstart', arm, _supportsPassive?{passive:true}:false);

  on(row,'dragstart', function(){
    document.body.classList.add('dragging-item');
    placeholder = document.createElement('div');
    placeholder.className='tier-row';
    placeholder.style.height = row.getBoundingClientRect().height+'px';
    placeholder.style.borderRadius='12px';
    placeholder.style.border='2px dashed rgba(139,125,255,.25)';
    board.insertBefore(placeholder, row.nextSibling);
    setTimeout(function(){ row.style.display='none'; },0);
  });
  on(row,'dragend', function(){
    row.style.display='';
    if (placeholder && placeholder.parentNode){ board.insertBefore(row, placeholder); placeholder.parentNode.removeChild(placeholder); }
    row.removeAttribute('draggable'); placeholder=null;
    document.body.classList.remove('dragging-item');
  });
  on(board,'dragover', function(e){
    if(!placeholder) return; e.preventDefault();
    var after = rowAfterY(board, e.clientY);
    if (after) board.insertBefore(placeholder, after); else board.appendChild(placeholder);
  });
  function rowAfterY(container, y){
    var rows = Array.prototype.filter.call(container.querySelectorAll('.tier-row'), function(r){ return r!==placeholder && r.style.display!=='none'; });
    for (var i=0;i<rows.length;i++){ var r=rows[i], rect=r.getBoundingClientRect(); if (y < rect.top + rect.height/2) return r; }
    return null;
  }
}

/* ---------- Radial picker (mobile) ---------- */
var radial = $('#radialPicker');
var radialOpts = radial?$('.radial-options', radial):null;
var radialHighlight = radial?$('.radial-highlight', radial):null;
var radialCloseBtn = radial?$('.radial-close', radial):null;
var radialForToken = null;
var _radialGeo = [];

function rowCount(){ return $$('.tier-row').length; }
function uniformCenter(cx, cy, R){
  var M=16; return { x: Math.max(M+R, Math.min(window.innerWidth-M-R, cx)), y: Math.max(M+R, cy) };
}
function refreshRadialOptions(){
  if (!isSmall() || !radial || !radialForToken) return;
  openRadial(radialForToken);
}

function openRadial(token){
  if(!radial||!isSmall()) return;
  radialForToken = token;

  var rect = token.getBoundingClientRect();
  var cx = rect.left + rect.width/2;
  var cy = rect.top + rect.height/2;

  var rows = $$('.tier-row');
  var labels = rows.map(function(r){ return rowLabel(r); });
  var N = labels.length; if (!N) return;

  var DOT=42, GAP=6, degStart=200, degEnd=340, stepDeg=(degEnd-degStart)/Math.max(1,(N-1)), stepRad=stepDeg*Math.PI/180;
  var BASE_R=96, need=(DOT+GAP)/(2*Math.sin(Math.max(stepRad/2,0.05)));
  var R=Math.max(BASE_R, need);
  var center=uniformCenter(cx,cy,R);

  var positions=[];
  for (var i=0;i<N;i++){
    var ang=(degStart+stepDeg*i)*Math.PI/180;
    positions.push({ i:i, ang:ang, x:center.x+R*Math.cos(ang), y:center.y+R*Math.sin(ang) });
  }
  positions.sort(function(a,b){ return a.x - b.x; });
  _radialGeo = [];

  radialCloseBtn.style.left = cx+'px';
  radialCloseBtn.style.top  = cy+'px';

  radialOpts.innerHTML = '';
  for (let j=0;j<N;j++){
    (function(j){
      var row = rows[j];
      var pos = positions[j];
      var btn = document.createElement('button');
      btn.type='button'; btn.className='radial-option';
      btn.style.left = pos.x+'px';
      btn.style.top  = pos.y+'px';
      btn.style.transitionDelay = (j*14)+'ms';
      var dot=document.createElement('span'); dot.className='dot'; dot.textContent=labels[j]; btn.appendChild(dot);

      function makeHot(){ updateHighlight(j); }
      on(btn,'pointerenter', makeHot);
      on(btn,'pointerdown', function(e){ e.preventDefault(); makeHot(); });
      on(btn,'click', function(){ selectRadialTarget(row); });

      radialOpts.appendChild(btn);
      _radialGeo.push({x:pos.x, y:pos.y, row:row, btn:btn});
    })(j);
  }

  function backdrop(ev){
    if(ev.target.closest('.radial-option') || ev.target.closest('.radial-close')) return;
    var x=(ev.touches&&ev.touches[0]?ev.touches[0].clientX:ev.clientX);
    var y=(ev.touches&&ev.touches[0]?ev.touches[0].clientY:ev.clientY);
    var prevPE=radial.style.pointerEvents; radial.style.pointerEvents='none';
    var under=document.elementFromPoint(x,y); radial.style.pointerEvents=prevPE||'auto';
    var other=under && under.closest && under.closest('#tray .token');
    if(other){ closeRadial(); $$('.token.selected').forEach(function(t){t.classList.remove('selected');}); other.classList.add('selected'); openRadial(other); ev.preventDefault(); return; }
    closeRadial();
  }
  radial.addEventListener('pointerdown',backdrop,{passive:false});
  radial._backdropHandler=backdrop;

  radial.classList.remove('hidden');
  radial.classList.add('visible','show');
  radial.setAttribute('aria-hidden','false');
  setTimeout(function(){ radial.classList.remove('show'); }, 160 + N*14);
  if (_radialGeo.length){ updateHighlight(0); }
}
function updateHighlight(index){
  if(!_radialGeo.length) return;
  for(var i=0;i<_radialGeo.length;i++){ _radialGeo[i].btn.classList.toggle('is-hot', i===index); }
  if(radialHighlight){ radialHighlight.hidden=true; radialHighlight.dataset.index=String(index); }
}
if(radialCloseBtn){
  on(radialCloseBtn,'click', function(e){ e.stopPropagation(); closeRadial(); }, false);
}
function selectRadialTarget(row){
  if (!radialForToken || !row) return;
  var zone = row.querySelector('.tier-drop');
  var fromId = ensureId(radialForToken.parentElement,'zone');
  var origin = radialForToken.parentElement; ensureId(zone,'zone');
  flipZones([origin, zone], function(){ zone.appendChild(radialForToken); });
  radialForToken.classList.remove('selected');
  recordPlacement(radialForToken.id, fromId, zone.id);
  vib(7);
  closeRadial();
}
function closeRadial(){
  if(!radial) return;
  if(radial._backdropHandler){ radial.removeEventListener('pointerdown', radial._backdropHandler); delete radial._backdropHandler; }
  radial.classList.add('hidden');
  radial.classList.remove('visible','show');
  radial.setAttribute('aria-hidden','true');
  radialForToken = null;
  _radialGeo = [];
}
on(window,'resize', refreshRadialOptions);

/* ---------- Clear / Undo ---------- */
on($('#trashClear'),'click', function(){
  if (!confirm('Clear the entire tier board? This moves all placed items back to Image Storage.')) return;
  $$('.tier-drop .token').forEach(function(tok){ tray.appendChild(tok); });
});
on($('#undoBtn'),'click', function(){
  var last = historyStack.pop(); if (!last) return;
  performMove(last.itemId, last.fromId, last.beforeId);
  $('#undoBtn').disabled = historyStack.length===0;
});

/* ===== Export-only label fitter (bigger, perfectly centered, single line) ===== */
function fitExportLabel(lbl){
  var token = lbl.parentElement;
  var D = token.clientWidth;
  var innerPad = 12;

  lbl.style.whiteSpace = 'nowrap';
  lbl.style.lineHeight = '1';
  lbl.style.display = 'flex';
  lbl.style.alignItems = 'center';
  lbl.style.justifyContent = 'center';
  lbl.style.height = '100%';
  lbl.style.padding = '0 ' + innerPad + 'px';

  var minPx = Math.max(12, Math.floor(D * 0.18));
  var maxPx = Math.floor(D * 0.44);
  var best = minPx;

  function fits(px){
    lbl.style.fontSize = px + 'px';
    return lbl.scrollWidth <= (D - innerPad * 2);
  }
  while (minPx <= maxPx){
    var mid = (minPx + maxPx) >> 1;
    if (fits(mid)){ best = mid; minPx = mid + 1; }
    else { maxPx = mid - 1; }
  }
  lbl.style.fontSize = best + 'px';
}

/* ===== Save PNG (keeps on-screen circle size) ===== */
on($('#saveBtn'),'click', function(){
  $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
  $$('.dropzone.drag-over').forEach(function(z){ z.classList.remove('drag-over'); });

  var panel = $('#boardPanel');

  // Capture live computed styles from each label BEFORE cloning
  var liveLabels = $$('.token .label', panel);
  var liveStyles = liveLabels.map(function(lbl){
    var cs = getComputedStyle(lbl);
    return {
      fontSize: cs.fontSize,
      padding: cs.padding,
      lineHeight: cs.lineHeight,
      whiteSpace: cs.whiteSpace,
      display: cs.display,
      alignItems: cs.alignItems,
      justifyContent: cs.justifyContent,
      height: cs.height
    };
  });

  var cloneWrap = document.createElement('div');
  cloneWrap.style.position='fixed'; cloneWrap.style.left='-99999px'; cloneWrap.style.top='0';

  var clone = panel.cloneNode(true);
  clone.style.width = '1200px';
  clone.style.maxWidth = '1200px';

  // Only hide row X; preserve label styles as-is from live rendering
  var style = document.createElement('style');
  style.textContent = `
    .row-del{ display:none !important; }
    .token .label{
      font-weight:900 !important;
      text-shadow:none !important;
    }
  `;
  clone.appendChild(style);

  // drop empty title for export
  var title = clone.querySelector('.board-title');
  if (title && title.textContent.replace(/\s+/g,'') === '') {
    var wrap = title.parentElement;
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  // Apply captured live styles directly to cloned labels (no recalculation)
  var cloneLabels = $$('.token .label', clone);
  cloneLabels.forEach(function(lbl, i){
    if (liveStyles[i]) {
      lbl.style.fontSize = liveStyles[i].fontSize;
      lbl.style.padding = liveStyles[i].padding;
      lbl.style.lineHeight = liveStyles[i].lineHeight;
      lbl.style.whiteSpace = liveStyles[i].whiteSpace;
      lbl.style.display = liveStyles[i].display;
      lbl.style.alignItems = liveStyles[i].alignItems;
      lbl.style.justifyContent = liveStyles[i].justifyContent;
      lbl.style.height = liveStyles[i].height;
    }
  });

  cloneWrap.appendChild(clone);
  document.body.appendChild(cloneWrap);

  html2canvas(clone, {
    backgroundColor: cssVar('--surface') || null,
    useCORS: true,
    scale: 2,
    width: 1200,
    windowWidth: 1200
  }).then(function(canvas){
    var a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download='tier-list.png';
    document.body.appendChild(a); a.click(); a.remove();
    cloneWrap.remove();
  }).catch(function(){ cloneWrap.remove(); });
});

/* ---------- Keyboard quick-jump (1..N) ---------- */
on(document,'keydown',function(e){
  var selected=$('.token.selected'); if(!selected) return;
  var n=parseInt(e.key,10); if(!isNaN(n)&&n>=1&&n<=rowCount()){
    e.preventDefault(); var rows=$$('.tier-row'); var row=rows[n-1]; if(!row) return;
    var zone=row.querySelector('.tier-drop'); var fromId=ensureId(selected.parentElement,'zone');
    var origin=selected.parentElement; ensureId(zone,'zone');
    flipZones([origin, zone], function(){ zone.appendChild(selected); });
    selected.classList.remove('selected');
    recordPlacement(selected.id,fromId,zone.id,''); vib(4); live('Moved "'+(selected.innerText||'item')+'" to '+rowLabel(row));
  }
});

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', function start(){
  board = $('#tierBoard'); tray = $('#tray');

  // rows
  defaultTiers.forEach(function(t){ board.appendChild(createRow(t)); });

  // tray defaults (pre-rendered with black labels)
  communityCast.forEach(function(n){ tray.appendChild(buildNameToken(n, nextPreset(), true)); });

  // add tier
  on($('#addTierBtn'),'click', function(){
    board.appendChild(createRow({label:'NEW', color: nextTierColor()}));
    refreshRadialOptions();
  });

  // creators
  on($('#addNameBtn'),'click', function(){
    var name = $('#nameInput').value.trim();
    if (!name) return;
    tray.appendChild(buildNameToken(name, $('#nameColor').value, false));
    $('#nameInput').value=''; $('#nameColor').value = nextPreset();
    refitAllLabels();
  });
  on($('#imageInput'),'change', function(e){
    Array.prototype.forEach.call(e.target.files, function(file){
      if(!file.type || file.type.indexOf('image/')!==0) return;
      var reader = new FileReader();
      reader.onload = function(ev){ tray.appendChild(buildImageToken(ev.target.result, file.name)); };
      reader.readAsDataURL(file);
    });
  });

  // Help copy
  var help=$('#helpText') || $('.help');
  if(help){
    help.innerHTML =
      '<strong>Help</strong><br>' +
      (isSmall()
       ? 'Phone: tap a circle in Image Storage to choose a row. Once placed, drag to reorder or drag back to Image Storage.'
       : 'Desktop/iPad: drag circles into rows. You can reorder or drag back to Image Storage.') +
      ' Tap the small X on a tier label to delete that row (its items return to Image Storage).';
  }

  enableClickToPlace(tray);
  refitAllLabels();
  live('Ready.');
});
