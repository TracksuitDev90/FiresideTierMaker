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
function animateBtn(btn){ if(!btn) return; btn.classList.remove('animate'); void btn.offsetWidth; btn.classList.add('animate'); setTimeout(function(){ btn.classList.remove('animate'); }, 300); }
// True when the user is typing in an input/textarea/contenteditable —
// global shortcuts must never fire mid-edit.
function isTypingTarget(t){ return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)); }
// Storage access can throw outright (Safari "Block All Cookies", strict
// privacy modes, some in-app browsers). Never let that take the app down.
function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); return true; } catch(e){ return false; } }
function lsRemove(k){ try { localStorage.removeItem(k); } catch(e){} }
// Saved JSON blobs whose image references must survive image GC even though
// the live board doesn't use them — e.g. the "Board cleared → Undo" backup.
// (Declared up here because the clear-backup check runs during script parse.)
var _gcProtectedJson = [];
// Human-readable name for a token (text label, image alt, or a fallback) —
// used in screen-reader announcements instead of innerText, which is empty
// for image tokens.
function tokenName(el){
  if (!el) return 'item';
  var lbl = el.querySelector && el.querySelector('.label');
  if (lbl && lbl.textContent.trim()) return lbl.textContent.trim();
  var img = el.querySelector && el.querySelector('img');
  if (img && img.alt) return img.alt;
  return img ? 'image' : 'item';
}
// Insert pasted content as plain text only (no markup, images or line
// breaks) — shared by every contenteditable label in the app.
function pastePlainText(e){
  e.preventDefault();
  var cd = e.clipboardData || window.clipboardData;
  var text = (cd && cd.getData('text/plain')) || '';
  text = text.replace(/[\r\n]+/g, ' ');
  if (document.queryCommandSupported && document.queryCommandSupported('insertText')){
    document.execCommand('insertText', false, text);
  } else {
    var sel = window.getSelection();
    if (sel && sel.rangeCount){
      var range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }
  }
}

/* ---------- Color helpers ---------- */
function hexToRgb(hex){ var m=hex.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/); if(m) return {r:parseInt(m[1],10),g:parseInt(m[2],10),b:parseInt(m[3],10)}; var h=hex.replace('#',''); if(h.length===3){ h=h.split('').map(function(x){return x+x;}).join(''); } var n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(function(v){return v.toString(16).padStart(2,'0');}).join(''); }
function relativeLuminance(rgb){ function srgb(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); } return 0.2126*srgb(rgb.r)+0.7152*srgb(rgb.g)+0.0722*srgb(rgb.b); }
function darken(hex,p){ var c=hexToRgb(hex); var f=(1-(p||0)); return rgbToHex(Math.round(c.r*f),Math.round(c.g*f),Math.round(c.b*f)); }
function lighten(hex,p){ var c=hexToRgb(hex), f=p||0; return rgbToHex(Math.round(c.r+(255-c.r)*f), Math.round(c.g+(255-c.g)*f), Math.round(c.b+(255-c.b)*f)); }
function mixHex(aHex,bHex,t){ var a=hexToRgb(aHex), b=hexToRgb(bHex);
  return rgbToHex(
    Math.round(a.r+(b.r-a.r)*t),
    Math.round(a.g+(b.g-a.g)*t),
    Math.round(a.b+(b.b-a.b)*t)
  );
}
/* HSL→hex (h 0-360, s/l 0-100). Pairs with colorToHsl below so every
   saturation/lightness tweak shares one correct RGB↔HSL implementation. */
function hslToHex(h,s,l){
  h=(((h%360)+360)%360)/360; s=Math.max(0,Math.min(100,s))/100; l=Math.max(0,Math.min(100,l))/100;
  function hue2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
  var r,g,b;
  if(s===0){ r=g=b=l; } else {
    var q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
  }
  return rgbToHex(Math.round(r*255),Math.round(g*255),Math.round(b*255));
}
/* Boost saturation by amount (0-1) */
function boostSaturation(hex, amount){
  var c=colorToHsl(hex);
  return hslToHex(c.h, c.s + amount*100, c.l);
}
/* Reduce saturation by amount (0-1) */
function desaturate(hex, amount){
  var c=colorToHsl(hex);
  return hslToHex(c.h, c.s - amount*100, c.l);
}

/* ---------- Theme (button shows TARGET mode) ---------- */
(function(){
  var root=document.documentElement;
  var toggle=$('#themeToggle');
  var prefersLight=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);

  setTheme(lsGet('tm_theme') || (prefersLight ? 'light' : 'dark'));

  if(toggle){
    on(toggle,'click', function(){
      var toDark = root.getAttribute('data-theme') !== 'dark';
      clearTimeout(toggle._twinkleT);
      toggle.classList.remove('twinkle','hold-moon');
      var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(toDark && !calm){
        // Tapping the moon: its stars twinkle while the page goes dark, then
        // it turns into the sun (the icon swap waits for the twinkle).
        void toggle.offsetWidth;
        toggle.classList.add('twinkle','hold-moon');
        setTheme('dark');
        toggle._twinkleT = setTimeout(function(){
          toggle.classList.remove('twinkle','hold-moon');
          animateBtn(toggle);
        }, 720);
      } else {
        animateBtn(toggle);
        setTheme(toDark ? 'dark' : 'light');
      }
    });
  }

  function setTheme(mode){
    root.setAttribute('data-theme', mode); lsSet('tm_theme', mode);
    // Keep browser chrome (address bar / status bar) in step with the theme
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if(metaTheme) metaTheme.setAttribute('content', mode==='light' ? '#f7f8fb' : '#0a0a0a');
    var target = mode==='dark' ? 'Light' : 'Dark';
    if(toggle){
      // The sun/moon icon itself is chosen by CSS from data-theme
      var text=$('.theme-text',toggle);
      if(text) text.textContent = target;
      toggle.setAttribute('aria-label', 'Switch to ' + target.toLowerCase() + ' theme');
    }
    $$('.tier-row').forEach(function(row){
      var chip=$('.label-chip',row), drop=$('.tier-drop',row);
      var color = chip && chip.dataset.color ? chip.dataset.color : '#8b7dff';
      if(chip) paintTierChip(chip, color);
      if (drop && drop.dataset.manual!=='true'){
        drop.style.background = tintFrom(color);
      }
    });
  }
})();

/* Tier chip colors: a theme-tuned background with white text. Light chips
   (yellows, pastels) get a slightly stronger soft shadow behind the white
   letters so they stay legible. */
function tierChipColors(color){
  var isLight = document.documentElement.getAttribute('data-theme')==='light';
  var rgb = hexToRgb(color), sat = Math.max(rgb.r,rgb.g,rgb.b)-Math.min(rgb.r,rgb.g,rgb.b);
  var bg = sat < 20 ? (isLight ? '#636363' : '#7d7d7d')   // grays (and black) read as a neutral chip
         : (isLight ? boostSaturation(color, 0.12) : desaturate(color, 0.12));
  return { bg: bg, fg: '#ffffff', light: relativeLuminance(hexToRgb(bg)) > 0.4 };
}
function paintTierChip(el, color){
  var cc = tierChipColors(color);
  el.style.background = cc.bg;
  el.style.color = cc.fg;
  el.classList.toggle('chip-light', cc.light);
  return cc;
}

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
            setTimeout(function(){ t.classList.remove('flip-anim'); t.style.transform=''; },180);
          });
        }
      });
    });
  });
}

/* ---------- Color picker dot color (40% darker, inverted for extremes) ---------- */
function colorPickDotColor(hex){
  var rgb = hexToRgb(hex);
  var lum = relativeLuminance(rgb);
  if(lum < 0.05) return lighten(hex, 0.6);
  if(lum > 0.85) return darken(hex, 0.6);
  return darken(hex, 0.40);
}

/* ---------- Build a row ---------- */
function buildRowDom(){
  var row=document.createElement('div'); row.className='tier-row';
  var labelWrap=document.createElement('div'); labelWrap.className='tier-label';

  var chip=document.createElement('div');
  chip.className='label-chip'; chip.setAttribute('contenteditable','true'); chip.setAttribute('spellcheck','false');

  /* Color picker: flat colored dot inside <label> — click natively opens color input */
  var colorBtn=document.createElement('label'); colorBtn.className='color-pick-btn';
  colorBtn.setAttribute('aria-label','Change tier color');
  var colorDot=document.createElement('span'); colorDot.className='color-dot-indicator';
  colorBtn.appendChild(colorDot);
  var colorInput=document.createElement('input'); colorInput.type='color'; colorInput.className='color-pick-input';
  colorInput.setAttribute('tabindex','-1'); colorInput.setAttribute('aria-hidden','true');
  colorBtn.appendChild(colorInput);

  var del=document.createElement('button'); del.className='row-del'; del.type='button';
  del.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';

  var chipArea = document.createElement('div');
  chipArea.className = 'chip-area';
  chipArea.appendChild(chip);
  chipArea.appendChild(colorBtn);
  labelWrap.appendChild(chipArea);
  labelWrap.appendChild(del);

  var drop=document.createElement('div');
  drop.className='tier-drop dropzone'; drop.setAttribute('tabindex','0'); drop.setAttribute('role','list');

  row.appendChild(labelWrap); row.appendChild(drop);
  return { row: row, chip: chip, del: del, drop: drop, labelWrap: labelWrap, colorBtn: colorBtn, colorInput: colorInput };
}

function tintFrom(color){
  var surface = cssVar('--surface') || '#121212';
  var a=hexToRgb(surface), b=hexToRgb(color);
  var dark = document.documentElement.getAttribute('data-theme')!=='light';
  var amt = dark?0.10:0.16;
  return rgbToHex(
    Math.round(a.r+(b.r-a.r)*amt),
    Math.round(a.g+(b.g-a.g)*amt),
    Math.round(a.b+(b.b-a.b)*amt)
  );
}
function ensureId(el, prefix){ if(!el.id){ el.id=(prefix||'id')+'-'+uid(); } return el.id; }
function rowLabel(row){ var chip=row?row.querySelector('.label-chip'):null; if(!chip) return 'row'; if(chip.classList.contains('has-crest')){ var img=chip.querySelector('.label-crest'); return img&&img.alt?img.alt:'crest'; } return chip.textContent.replace(/\s+/g,' ').trim()||'row'; }

/* ---------- Chip label auto-sizer ---------- */
/* The tier box never changes size (its label area is absolutely positioned);
   only the font does. A fast canvas estimate (binary search over word-wrap
   simulation, never breaking a word) picks a starting size, then the real
   rendering is checked and the size steps down until nothing spills — canvas
   metrics are close but not exact for Bowlby One. Only when even the minimum
   size can't fit a single long word may that word break. */
function chipContentBox(chip){
  var cs = getComputedStyle(chip);
  var w = chip.clientWidth - (parseFloat(cs.paddingLeft)||0) - (parseFloat(cs.paddingRight)||0);
  var h = chip.clientHeight;
  // Measure against the tier's minimum height so every tier's letter matches
  var labBox = chip.closest ? chip.closest('.tier-label') : null;
  var minH = labBox ? parseFloat(getComputedStyle(labBox).minHeight) : 0;
  if (minH > 0) h = Math.min(h, minH - 2);
  h -= (parseFloat(cs.paddingTop)||0) + (parseFloat(cs.paddingBottom)||0);
  return { w: w, h: h };
}
function chipOverflows(chip, box){
  var r = document.createRange();
  r.selectNodeContents(chip);
  var b = r.getBoundingClientRect();
  if (r.detach) r.detach();
  return b.width > box.w + 0.5 || b.height > box.h + 0.5;
}
function fitChipLabel(chip){
  if (!chip) return;
  if (chip.classList.contains('has-crest')) return;
  var text = chip.textContent.replace(/\s+/g,' ').trim();
  chip.classList.remove('chip-wrap-any');
  if (!text) { chip.style.fontSize = ''; return; }

  var measured = chip.isConnected && chip.clientWidth > 0 && chip.clientHeight > 0;
  var box = measured ? chipContentBox(chip) : { w: (isSmall() ? 130 : 180) - 16, h: 99 - 12 };
  var availW = box.w, availH = box.h;
  var narrow = availW < 104;

  var upper = text.toUpperCase();
  // Bowlby One's glyphs sit taller than its 1.1 line box, so short labels
  // also cap by height.
  var maxPx = Math.max(12, Math.min(48, Math.floor((availH - 2) / 1.25)));
  var minPx = narrow ? 9 : 12;
  var lo = minPx, hi = maxPx;
  while (lo < hi) {
    var mid = Math.ceil((lo + hi) / 2);
    if (labelFitsAt(upper, mid, availW, availH)) lo = mid;  // fits — try larger
    else hi = mid - 1;                                        // overflow — try smaller
  }
  chip.style.fontSize = lo + 'px';

  if (measured) {
    // Verify with the browser's real layout and step down until it fits
    while (lo > minPx && chipOverflows(chip, box)) { lo--; chip.style.fontSize = lo + 'px'; }
    if (chipOverflows(chip, box)) chip.classList.add('chip-wrap-any');
  } else if (!labelFitsAt(upper, lo, availW, availH)) {
    chip.classList.add('chip-wrap-any');
  }
  chip.scrollLeft = 0;
}

/* Check whether uppercased `text` at `px` font-size fits inside
   w × h, simulating CSS word-wrap (break at spaces, never mid-word). */
function labelFitsAt(text, px, w, h) {
  var words = text.split(/\s+/);
  var lineH = px * 1.1;   // matches CSS line-height:1.1
  var spaceW = measureText(' ', '400', px) + 0.5;  // + letter-spacing
  var lines = 1, lineW = 0;

  for (var i = 0; i < words.length; i++) {
    // 1.1× safety margin: canvas measurement can under-report Bowlby One width
    var ww = (measureText(words[i], '400', px) + words[i].length * 0.5) * 1.1;
    if (ww > w) return false;            // single word too wide
    if (lineW > 0 && lineW + spaceW + ww > w) {
      lines++;                           // wrap to next line
      lineW = ww;
    } else {
      lineW += (lineW > 0 ? spaceW : 0) + ww;
    }
  }
  return lines * lineH <= h;
}

/* Equalize all tier label font sizes to the smallest needed.
   Short labels (1-2 chars like S, A, B, C, D) keep their own large
   individual size.  Only labels with 3+ characters participate in
   uniform sizing so that longer/custom text looks consistent without
   dragging single-letter defaults down. */
function uniformizeTierLabels(){
  var chips = $$('#tierBoard .label-chip');
  if (!chips.length) return;
  // Skip image-based labels
  var textChips = chips.filter(function(c){ return !c.classList.contains('has-crest'); });
  // Fit each chip individually first
  textChips.forEach(function(c){ fitChipLabel(c); });
  // Only uniformize chips whose text is 3+ characters
  var longChips = textChips.filter(function(c){
    return c.textContent.replace(/\s+/g,' ').trim().length > 2;
  });
  if (longChips.length < 2) return;
  var minSize = Infinity;
  longChips.forEach(function(c){
    var sz = parseInt(c.style.fontSize, 10);
    if (sz && sz < minSize) minSize = sz;
  });
  if (minSize < Infinity && minSize > 0) {
    longChips.forEach(function(c){ c.style.fontSize = minSize + 'px'; });
  }
}

/* ---------- Apply tier color to all related elements ---------- */
function applyTierColor(node, color){
  var chip = node.querySelector('.label-chip');
  var del = node.querySelector('.row-del');
  var drop = node.querySelector('.tier-drop');
  var colorBtn = node.querySelector('.color-pick-btn');
  var colorInput = node.querySelector('.color-pick-input');

  if(chip){ chip.dataset.color = color; paintTierChip(chip, color); }
  if(del) del.style.background = darken(color, 0.35);
  if(drop){ drop.style.background = tintFrom(color); drop.dataset.manual = 'false'; }
  if(colorBtn){ var dot = colorBtn.querySelector('.color-dot-indicator'); if(dot) dot.style.background = colorPickDotColor(color); }
  if(colorInput) colorInput.value = color;
}

/* Reveal a tier's tools (delete X, color dot) when its label is touched, then
   fade them away after a few idle seconds. Touch devices have no hover; the
   tools stay hidden until asked for so the board isn't covered in X buttons. */
function pokeTierTools(labelArea){
  if(!labelArea) return;
  labelArea.classList.add('show-tools');
  clearTimeout(labelArea._toolTimer);
  labelArea._toolTimer = setTimeout(function(){ labelArea.classList.remove('show-tools'); }, 8000);
}

/* ---------- Create / wire a new row ---------- */
function createRow(cfg){
  var dom = buildRowDom();
  var node = dom.row, chip = dom.chip, del = dom.del, drop = dom.drop, labelArea = dom.labelWrap;
  var colorBtn = dom.colorBtn, colorInput = dom.colorInput;

  ensureId(drop,'zone');

  /* Image-based tier label: show crest image instead of text */
  if(cfg.image){
    var img = document.createElement('img');
    img.src = cfg.image;
    img.alt = cfg.label || '';
    img.className = 'label-crest';
    img.draggable = false;
    chip.textContent = '';
    chip.appendChild(img);
    chip.removeAttribute('contenteditable');
    chip.classList.add('has-crest');
    chip.dataset.crestSrc = cfg.image;
  } else {
    chip.textContent = cfg.label;
    chip.setAttribute('aria-label', 'Tier name');
  }
  applyTierColor(node, cfg.color);

  on(chip,'input', function(){
    if(chip.classList.contains('has-crest')) return;
    uniformizeTierLabels();
    // Browser may re-scroll contenteditable after style changes;
    // reset scroll in the next frame so text stays left-aligned
    chip.scrollLeft = 0;
    requestAnimationFrame(function(){ chip.scrollLeft = 0; });
    // Text edits are characterData mutations the board observer doesn't see —
    // save explicitly so a rename survives a reload.
    scheduleSave();
  });
  on(chip,'keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); chip.blur(); } });
  on(chip,'paste', function(e){ if(!chip.classList.contains('has-crest')) pastePlainText(e); });
  on(chip,'blur', function(){ if(!chip.classList.contains('has-crest')){ uniformizeTierLabels(); chip.scrollLeft = 0; scheduleSave(); } });
  if(!cfg.image) fitChipLabel(chip);

  /* Color picker — label wraps input so native click opens the dialog */
  on(colorBtn,'click', function(e){ e.stopPropagation(); });
  on(colorInput,'input', function(){ applyTierColor(node, colorInput.value); scheduleSave(); });
  on(colorInput,'change', function(){
    applyTierColor(node, colorInput.value); scheduleSave();
    node.classList.add('color-flash'); setTimeout(function(){ node.classList.remove('color-flash'); }, 350);
  });

  /* Reveal tools on tap (mobile — no hover) */
  on(labelArea,'pointerdown', function(e){
    if(e.target.closest('.color-pick-btn') || e.target.closest('.row-del') || document.activeElement===chip) return;
    pokeTierTools(labelArea);
  });


  on(del,'click', function(){
    var tokens = $$('.token', drop);
    // Record before detaching so Undo can bring the tier (and its tokens) back
    var nextRow = node.nextElementSibling;
    pushHistory({
      type: 'deleteRow',
      element: node,
      beforeId: nextRow ? ensureId(nextRow, 'row') : '',
      tokens: tokens
    });
    flipZones([drop,tray], function(){ tokens.forEach(function(t){ tray.appendChild(t); }); });
    node.remove(); uniformizeTierLabels(); refreshRadialOptions();
    scheduleSave();
  });

  enableRowReorder(labelArea, node);
  enableClickToPlace(drop);
  return node;
}

/* ---------- Defaults ---------- */
var defaultTiers = [
  { label:'S', color:'#ff6b6b' },
  { label:'A', color:'#F2D04E' },
  { label:'B', color:'#22c55e' },
  { label:'C', color:'#3b82f6' },
  { label:'D', color:'#a78bfa' },
  { label:'?', color:'#71717a' }              // "do not interact" / unsure
];

/* Fresh colors for new tiers (avoids default S/A/B/C/D colors) */
var NEW_TIER_COLORS = shuffleArray(['#06b6d4','#e11d48','#16a34a','#f97316','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1','#84cc16','#ef4444']);
var tierIdx = 0;
function nextTierColor(){ var c=NEW_TIER_COLORS[tierIdx%NEW_TIER_COLORS.length]; tierIdx++; return c; }

var communityCast = [
  "Anette","Andruw","Authority","B7","Camryn","Cindy","Cody","Cookies",
  "Denver","Devon","Dexy","Dior","Domo","Gavin","Harry","Haven","Katie","Kiev","Kikki",
  "Meegan","Michael","Mew","Neil","NJ","Paper","Ray","Raymond","Safoof","Smitty","Tubawk","Versse","Vyken","Micah"
];

/* Fixed signature colors for specific cast members — never rotate */
var DEFAULT_TOKEN_COLORS = {
  'Cody':   '#8F949E',
  'Camryn': '#99748f',
  'Devon':  '#7E57C2',
  'Versse': '#19852d',
  'Haven':  '#FFBC00',
  'Cindy':  '#F5B0BD'
};

/* ---------- PRE-RENDERED CIRCLE PALETTE ---------- */
var BASE_PALETTE = [
  '#E57373','#F06292','#FF8A65','#FFB74D','#FFD54F',
  '#FFF176','#E6EE9C','#C5E1A5','#AED581','#81C784',
  '#80CBC4','#4DB6AC','#81D4FA','#4FC3F7','#64B5F6',
  '#9FA8DA','#7986CB','#B39DDB','#CE93D8','#BA68C8',
  '#D7CCC8','#BCAAA4','#A1887F','#B0BEC5','#90A4AE'
];

/* Token text: 50% darker than base, lightened for very dark backgrounds */
function pickTextColor(bgHex){
  var lum = relativeLuminance(hexToRgb(bgHex));
  if(lum < 0.12) return lighten(bgHex, 0.50);
  return darken(bgHex, 0.50);
}

/* ---------- Color → HSL ---------- */
/* Parse #hex or rgb() to HSL (h 0-360, s/l 0-100); hexToRgb handles both forms */
function colorToHsl(color){
  var c = hexToRgb(color), r=c.r/255, g=c.g/255, b=c.b/255;
  var max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  var h=0, s=0, l=(max+min)/2;
  if(d!==0){
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    if(max===r) h=((g-b)/d+(g<b?6:0))/6;
    else if(max===g) h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  return { h:h*360, s:s*100, l:l*100 };
}
/* Fisher-Yates shuffle so tokens get different colors each page load */
function shuffleArray(arr){
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; }
  return arr;
}
var presetPalette = shuffleArray(BASE_PALETTE.slice());
var pIndex = 0;
function nextPreset(){ var c = presetPalette[pIndex % presetPalette.length]; pIndex++; return c; }

/* ---------- Canvas text measurement (avoids scrollWidth bugs) ---------- */
var _measureCtx = null;
var _bowlbyReady = false;
/* Ensure Bowlby One is loaded before first measurement; once loaded
   re-fit every tier label so sizes are accurate. */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function(){ _bowlbyReady = true; clearMeasureCache(); uniformizeTierLabels(); refitAllLabels(); });
} else { _bowlbyReady = true; } // fallback for very old browsers

/* Pre-fetch Bowlby One & Montserrat as base64 so html-to-image can embed them in SVG exports.
   Google Fonts <link> stylesheets are cross-origin and invisible to the library.
   We replace ALL woff2 URLs in the CSS (covering every unicode-range block)
   so that basic Latin characters render correctly in screenshots. */
var _bowlbyFontFaceCSS = '';
var _montserratFontFaceCSS = '';
function _preloadGoogleFont(url, familyName, weight, cb){
  fetch(url)
    .then(function(r){ return r.text(); })
    .then(function(css){
      // Collect every woff2 URL in the stylesheet (one per unicode-range block)
      var re = /url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/g;
      var urls = []; var m;
      while ((m = re.exec(css)) !== null) urls.push(m[1]);
      if (!urls.length) return;
      // Fetch each font subset and convert to base64, then replace URLs in the original CSS
      return Promise.all(urls.map(function(fontUrl){
        return fetch(fontUrl).then(function(r){ return r.blob(); }).then(function(blob){
          return new Promise(function(resolve){
            var reader = new FileReader();
            reader.onloadend = function(){ resolve({ url: fontUrl, dataUrl: reader.result }); };
            reader.readAsDataURL(blob);
          });
        });
      })).then(function(results){
        var embeddedCSS = css;
        results.forEach(function(r){
          embeddedCSS = embeddedCSS.split(r.url).join(r.dataUrl);
        });
        cb(embeddedCSS);
      });
    }).catch(function(){}); // silent fail — export will use fallback font
}
/* Fonts are only needed for PNG export — fetch them lazily on the first Save
   instead of downloading + base64-encoding every subset on every page load.
   Resolves after both fonts load, or after a 5s timeout so a slow/offline
   font CDN can never wedge the Save button (export falls back gracefully). */
var _exportFontsPromise = null;
function ensureExportFonts(){
  if (_exportFontsPromise) return _exportFontsPromise;
  function loadOne(url, assign){
    return new Promise(function(resolve){
      var settled = false;
      function finish(){ if(!settled){ settled = true; resolve(); } }
      _preloadGoogleFont(url, '', '', function(css){ assign(css); finish(); });
      setTimeout(finish, 5000);
    });
  }
  _exportFontsPromise = Promise.all([
    loadOne('https://fonts.googleapis.com/css2?family=Bowlby+One&display=swap', function(css){ _bowlbyFontFaceCSS = css; }),
    loadOne('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap', function(css){ _montserratFontFaceCSS = css; })
  ]);
  return _exportFontsPromise;
}
window.ensureExportFonts = ensureExportFonts;

/* ---------- Export pipeline (tier list, quadrant chart, bracket) ----------
   The export library is only needed for Save, so it's loaded on demand
   (self-hosted first; CDNs only as a fallback) instead of blocking app
   start-up. Rendering has a timeout, scales down for tall boards to stay under
   iOS Safari's canvas limit, and hands the PNG over in the way that works on
   the device (download on desktop; a preview sheet with Share on phones). */
var EXPORT_LIB_SOURCES = [
  'vendor/html-to-image.min.js',
  'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js',
  'https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.min.js'
];
var _exportLibPromise = null;
function loadExportLib(){
  if (window.htmlToImage && typeof htmlToImage.toCanvas === 'function') return Promise.resolve();
  if (_exportLibPromise) return _exportLibPromise;
  _exportLibPromise = new Promise(function(resolve, reject){
    var i = 0;
    (function next(){
      if (window.htmlToImage && typeof htmlToImage.toCanvas === 'function') { resolve(); return; }
      if (i >= EXPORT_LIB_SOURCES.length){ _exportLibPromise = null; reject(new Error('export-lib')); return; }
      var sc = document.createElement('script');
      var src = EXPORT_LIB_SOURCES[i++];
      sc.src = src; sc.async = true;
      if (/^https?:/.test(src)) sc.crossOrigin = 'anonymous';
      var t = setTimeout(function(){ sc.onload = sc.onerror = null; next(); }, 12000);
      sc.onload = function(){ clearTimeout(t); next(); };
      sc.onerror = function(){ clearTimeout(t); if (sc.parentNode) sc.parentNode.removeChild(sc); next(); };
      document.head.appendChild(sc);
    })();
  });
  return _exportLibPromise;
}
window.loadExportLib = loadExportLib;
function prepareExport(){ return Promise.all([ensureExportFonts(), loadExportLib()]); }

function withTimeout(promise, ms, code){
  return new Promise(function(resolve, reject){
    var t = setTimeout(function(){ var e = new Error(code || 'timeout'); e.code = code || 'timeout'; reject(e); }, ms);
    promise.then(function(v){ clearTimeout(t); resolve(v); }, function(e){ clearTimeout(t); reject(e); });
  });
}
// iOS Safari refuses canvases above ~16.7 megapixels (less on older phones) —
// shrink the pixel ratio for tall boards instead of producing a blank image.
var MAX_EXPORT_PIXELS = 14e6;
function exportPixelRatio(node){
  var w = node.offsetWidth || 1200, h = node.offsetHeight || 800;
  var r = Math.min(2, Math.sqrt(MAX_EXPORT_PIXELS / (w * h)));
  return Math.max(0.5, Math.floor(r * 100) / 100);
}
function canvasToBlob(canvas){
  return new Promise(function(resolve, reject){
    if (canvas.toBlob) canvas.toBlob(function(b){ b ? resolve(b) : reject(new Error('blob')); }, 'image/png');
    else fetch(canvas.toDataURL('image/png')).then(function(r){ return r.blob(); }).then(resolve, reject);
  });
}
function exportFilename(fallback){
  var t = (($('.board-title') || {}).textContent || '').trim();
  var slug = t.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60);
  return (slug || fallback) + '.png';
}
function downloadBlob(blob, filename){
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 4000);
}
function canShareFile(file){
  try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] })); } catch(e){ return false; }
}
function isTouchDevice(){
  return isSmall() || (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
}
/* Phones: a preview sheet. The Share button runs inside a fresh tap (share
   sheets need one), "Save to Photos"/Discord live there; Download is the
   fallback, and in in-app browsers that ignore downloads the preview itself
   can be pressed-and-held to save. */
function showExportSheet(blob, filename){
  var url = URL.createObjectURL(blob);
  var file = null;
  try { file = new File([blob], filename, { type: 'image/png' }); } catch(e){}
  var overlay = document.createElement('div');
  overlay.className = 'confirm-overlay export-overlay';
  var card = document.createElement('div');
  card.className = 'confirm-card export-card';
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'exportTitle');
  card.innerHTML =
    '<h3 class="confirm-title" id="exportTitle">Your image is ready</h3>' +
    '<div class="export-preview"><img alt="Preview of the exported image"></div>' +
    '<p class="confirm-msg export-hint">Tip: press and hold the image to save it to your photos.</p>' +
    '<div class="export-actions"></div>';
  $('img', card).src = url;
  var actions = $('.export-actions', card);
  function close(){ overlay.remove(); document.removeEventListener('keydown', onKey); setTimeout(function(){ URL.revokeObjectURL(url); }, 1000); }
  function onKey(e){ if (e.key === 'Escape') close(); }
  function addBtn(label, cls, fn){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.textContent = label;
    on(b, 'click', fn); actions.appendChild(b); return b;
  }
  var first = null;
  if (file && canShareFile(file)){
    first = addBtn('Share / Save to Photos', 'export-share', function(){
      navigator.share({ files: [file], title: filename.replace(/\.png$/, '') }).then(function(){ close(); showSaveToast('Shared!'); })
        ['catch'](function(err){ if (err && err.name === 'AbortError') return; downloadBlob(blob, filename); showSaveToast('Downloaded ' + filename); });
    });
  }
  var dl = addBtn('Download', first ? 'export-download secondary' : 'export-download', function(){ downloadBlob(blob, filename); showSaveToast('Downloading ' + filename); });
  addBtn('Done', 'confirm-cancel', close);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  on(overlay, 'click', function(e){ if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  try { (first || dl).focus({ preventScroll: true }); } catch(e){}
}
function deliverPng(blob, filename){
  if (isTouchDevice()) { showExportSheet(blob, filename); return; }
  downloadBlob(blob, filename);
  showSaveToast('Saved!');
  vib([6, 40, 10]);
}
function exportErrorMessage(err){
  if (err && err.message === 'export-lib') return "Couldn't load the image exporter — check your connection";
  if (err && err.code === 'timeout') return 'Saving took too long — check your connection and try again';
  return 'Export failed — try again';
}

/* Save-button busy state shared by every export mode */
var _saveBusy = false, _saveBtnLabel = '';
function beginSaveBusy(){
  if (_saveBusy) return false;
  _saveBusy = true;
  var btn = $('#saveBtn'), lbl = btn ? btn.querySelector('span:not(.ico)') : null;
  if (btn){ btn.setAttribute('data-state', 'saving'); btn.disabled = true; }
  if (lbl){ _saveBtnLabel = lbl.textContent; lbl.textContent = 'Saving…'; }
  return true;
}
function endSaveBusy(){
  _saveBusy = false;
  var btn = $('#saveBtn'), lbl = btn ? btn.querySelector('span:not(.ico)') : null;
  if (btn){ btn.removeAttribute('data-state'); btn.disabled = false; }
  if (lbl && _saveBtnLabel) lbl.textContent = _saveBtnLabel;
}
/* Run one export: `build()` (called once fonts + library are ready) returns
   {node, wrap, filename, backgroundColor, width} for an offscreen clone. */
function runExport(build){
  if (!beginSaveBusy()) return;
  var made = null;
  prepareExport()
    .then(function(){
      made = build();
      var opts = {
        pixelRatio: exportPixelRatio(made.node),
        backgroundColor: made.backgroundColor || cssVar('--surface') || '#ffffff',
        // Revalidate (304s are cheap) rather than re-download every image
        fetchRequestInit: { mode: 'cors', cache: 'no-cache' }
      };
      if (made.width) opts.width = made.width;
      var fontCSS = (_bowlbyFontFaceCSS || '') + (_montserratFontFaceCSS || '');
      if (fontCSS) opts.fontEmbedCSS = fontCSS;
      return withTimeout(htmlToImage.toCanvas(made.node, opts), 25000, 'timeout');
    })
    .then(canvasToBlob)
    .then(function(blob){ deliverPng(blob, made.filename); })
    ['catch'](function(err){
      showSaveToast(exportErrorMessage(err), true);
      if (window.DEBUG) console.error('Export error:', err);
    })
    .then(function(){ if (made && made.wrap && made.wrap.parentNode) made.wrap.parentNode.removeChild(made.wrap); endSaveBusy(); });
}
window.runExport = runExport;
window.exportFilename = exportFilename;
// Memoize text-width lookups — the label fitters call these in tight
// binary-search loops with repeating (text, weight, px) tuples. Cleared when
// a web font loads (metrics change once the real font is available).
var _measureCache = {};
function clearMeasureCache(){ _measureCache = {}; }
window.clearMeasureCache = clearMeasureCache;
function measureText(text, fontWeight, px){
  var key = 'b' + fontWeight + '' + px + '' + text;
  if (key in _measureCache) return _measureCache[key];
  if(!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = fontWeight + ' ' + px + 'px "Bowlby One",ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial';
  return (_measureCache[key] = _measureCtx.measureText(text).width);
}
function measureTokenText(text, fontWeight, px){
  var key = 'm' + fontWeight + '' + px + '' + text;
  if (key in _measureCache) return _measureCache[key];
  if(!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = fontWeight + ' ' + px + 'px "Montserrat",ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial';
  return (_measureCache[key] = _measureCtx.measureText(text).width);
}

/* ---------- Live label fitter (UI) ---------- */
function fitLiveLabel(lbl){
  if (!lbl) return;
  var token = lbl.parentElement;
  var D = token.clientWidth;
  if (!D) return;
  // Scale with the token: 99px desktop tokens keep 8px padding / 11–22px text,
  // ~60px phone tokens get tighter padding and a smaller range.
  var small = D < 80;
  var pad = small ? Math.max(3, Math.round(D * 0.06)) : 8;
  var maxW = D - pad * 2;
  var text = lbl.textContent;

  var maxPx = small ? Math.round(D * 0.27) : 22, minPx = small ? 8 : 11;
  var px = maxPx;
  for (; px > minPx; px--) {
    if (measureTokenText(text, '900', px) <= maxW) break;
  }

  var s = lbl.style;
  s.fontFamily = "'Montserrat',ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  s.fontWeight = '900';
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
function refitAllLabels(){
  $$('.token .label').forEach(function(lbl){
    // Skip quadrant tokens — they use refitQToken with a smaller max size
    if(lbl.closest('.q-zone')) return;
    fitLiveLabel(lbl);
  });
  uniformizeTierLabels();
  // Refit quadrant tokens separately
  $$('.q-zone .token').forEach(function(tok){
    if(typeof window.refitQToken === 'function') window.refitQToken(tok);
  });
}
on(window,'resize', debounce(refitAllLabels, 120));

/* ---------- Tokens ---------- */
function buildTokenBase(isCustom){
  var el = document.createElement('div');
  el.className='token token-enter'; el.id = uid(); el.setAttribute('tabindex','0'); el.setAttribute('role','listitem');
  // touch-action lives in CSS: on phones every token is pan-y so the page
  // scrolls from anywhere; dragging a placed token starts after a short hold
  // (see enableMobileTouchDrag).
  el.setAttribute('draggable','false');
  if (isCustom) el.dataset.custom = 'true';
  setTimeout(function(){ el.classList.remove('token-enter'); }, 300);

  // Add delete button for custom tokens
  if (isCustom) {
    var delBtn = document.createElement('button');
    delBtn.className = 'token-del';
    delBtn.type = 'button';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18.3 5.7L12 12l-6.3-6.3-1.4 1.4 6.3 6.3-6.3 6.3 1.4 1.4 6.3-6.3 6.3 6.3 1.4-1.4-6.3-6.3 6.3-6.3z"/></svg>';
    delBtn.setAttribute('aria-label', 'Delete');
    on(delBtn, 'click', function(ev){
      ev.stopPropagation();
      var parent = el.parentElement;
      var next = el.nextElementSibling;
      recordDeletion(el, parent, next);
      el.remove();
      scheduleSave();
    });
    el.appendChild(delBtn);

    // Double-click (desktop) reveals the delete control. Phones use the
    // tap picker's explicit Delete action instead of a hidden gesture.
    function showDel(){
      $$('.token.show-del').forEach(function(t){ t.classList.remove('show-del'); });
      el.classList.add('show-del');
      clearTimeout(el._delDismiss);
      el._delDismiss = setTimeout(function(){ el.classList.remove('show-del'); }, 4000);
    }
    on(el, 'dblclick', function(e){ e.preventDefault(); e.stopPropagation(); showDel(); });
  }

  // A new press starts a new gesture: never let a previous drag's
  // "swallow the next click" flag eat this one.
  on(el, 'pointerdown', function(){ el._suppressClick = false; });

  // Attach all drag handlers; each checks isSmall() at event time
  if (window.PointerEvent) enablePointerDrag(el);
  else enableMouseTouchDragFallback(el);
  enableMobileTouchDrag(el);

  on(el,'click', function(ev){
    ev.stopPropagation();
    // The click that follows a finished drag isn't a selection
    if(el._suppressClick){ el._suppressClick = false; return; }
    var already = el.classList.contains('selected');
    $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
    // Phones: tapping a token in storage OR in a tier opens the picker, so a
    // placed token can be moved, sent back to storage or deleted by tap.
    var pickable = !!(el.closest('#tray') || el.closest('.tier-drop'));
    if (!already){
      el.classList.add('selected');
      if (isSmall() && pickable) openRadial(el);
    } else if (isSmall() && pickable){
      closeRadial();
    }
  });
  on(el,'keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.click(); } });
  return el;
}
function buildNameToken(name, bgColor, isCustom, textColor){
  var el = buildTokenBase(isCustom);
  el.style.background = bgColor;
  var label = document.createElement('div'); label.className='label'; label.textContent=name;
  label.style.color = textColor || pickTextColor(bgColor);
  el.appendChild(label);
  fitLiveLabel(label);
  return el;
}
function buildImageToken(src, alt){
  var el = buildTokenBase(true); // images are always custom
  el.classList.add('img-token');
  var img = document.createElement('img'); if(src) img.src=src; img.alt=alt||''; img.draggable=false; el.appendChild(img);
  // Desktop: double-click reveals "adjust crop" next to delete
  var cropBtn = document.createElement('button');
  cropBtn.className = 'token-crop';
  cropBtn.type = 'button';
  cropBtn.setAttribute('aria-label', 'Adjust image');
  cropBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>';
  on(cropBtn, 'click', function(ev){ ev.stopPropagation(); el.classList.remove('show-del'); openCropEditor(el); });
  el.insertBefore(cropBtn, img);
  return el;
}

/* ---------- Image crop (position + zoom inside the circle) ----------
   Stored per token as {x, y, z}: a translate in % of the token box plus a
   zoom factor, applied as a CSS transform on the <img>. Percentages keep it
   identical at every token size (phone, desktop, export, Versus). */
function parseCrop(v){
  if (!v) return null;
  if (typeof v === 'object') return { x: +v.x || 0, y: +v.y || 0, z: Math.max(1, +v.z || 1) };
  var p = String(v).split(',').map(Number);
  return p.length === 3 && p.every(isFinite) ? { x: p[0], y: p[1], z: Math.max(1, p[2]) } : null;
}
function cropTransform(c){
  if (!c || (!c.x && !c.y && c.z === 1)) return '';
  return 'translate(' + c.x.toFixed(2) + '%,' + c.y.toFixed(2) + '%) scale(' + c.z.toFixed(3) + ')';
}
function applyTokenCrop(tok, crop){
  var img = tok && tok.querySelector('img');
  if (!img) return;
  var c = parseCrop(crop);
  var t = cropTransform(c);
  img.style.transform = t;
  if (t) tok.dataset.crop = [c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(3)].join(',');
  else delete tok.dataset.crop;
}
window.parseCrop = parseCrop;
window.cropTransform = cropTransform;

function openCropEditor(tok){
  var srcImg = tok && tok.querySelector('img');
  if (!srcImg || !srcImg.src) return;
  var lastFocus = document.activeElement;
  var start = parseCrop(tok.dataset.crop) || { x: 0, y: 0, z: 1 };
  var crop = { x: start.x, y: start.y, z: start.z };

  var overlay = document.createElement('div');
  overlay.className = 'confirm-overlay crop-overlay';
  overlay.innerHTML =
    '<div class="confirm-card crop-card" role="dialog" aria-modal="true" aria-labelledby="cropTitle">' +
      '<h3 class="confirm-title" id="cropTitle">Adjust image</h3>' +
      '<p class="confirm-msg crop-hint">Drag to reposition · use the slider to zoom</p>' +
      '<div class="crop-stage" tabindex="0" aria-label="Image position — use arrow keys to move"><img alt="" draggable="false"></div>' +
      '<label class="crop-zoom"><span class="sr">Zoom</span>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<input type="range" min="1" max="3" step="0.01">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11h6M11 8v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</label>' +
      '<div class="confirm-actions">' +
        '<button type="button" class="btn crop-reset">Reset</button>' +
        '<span class="crop-spacer"></span>' +
        '<button type="button" class="btn confirm-cancel">Cancel</button>' +
        '<button type="button" class="btn crop-save">Save</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  var stage = $('.crop-stage', overlay), img = $('img', stage), zoom = $('input[type=range]', overlay);
  img.src = srcImg.src;
  zoom.value = crop.z;

  function limits(){
    var a = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
    return {
      x: Math.max(0, (crop.z * Math.max(a, 1) - 1) / 2 * 100),
      y: Math.max(0, (crop.z * Math.max(1 / a, 1) - 1) / 2 * 100)
    };
  }
  function render(){
    var L = limits();
    crop.x = Math.max(-L.x, Math.min(L.x, crop.x));
    crop.y = Math.max(-L.y, Math.min(L.y, crop.y));
    img.style.transform = cropTransform(crop) || 'none';
  }
  img.onload = render; render();

  on(zoom, 'input', function(){ crop.z = parseFloat(zoom.value) || 1; render(); });
  on(stage, 'wheel', function(e){ e.preventDefault(); crop.z = Math.max(1, Math.min(3, crop.z - e.deltaY * 0.002)); zoom.value = crop.z; render(); }, {passive:false});
  on(stage, 'keydown', function(e){
    var step = e.shiftKey ? 5 : 1.5, k = e.key;
    if (k === 'ArrowLeft') crop.x -= step; else if (k === 'ArrowRight') crop.x += step;
    else if (k === 'ArrowUp') crop.y -= step; else if (k === 'ArrowDown') crop.y += step; else return;
    e.preventDefault(); render();
  });
  on(stage, 'pointerdown', function(e){
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch(_){}
    stage.classList.add('dragging');
    var lx = e.clientX, ly = e.clientY, size = stage.clientWidth || 220;
    function mv(ev){
      crop.x += (ev.clientX - lx) / size * 100;
      crop.y += (ev.clientY - ly) / size * 100;
      lx = ev.clientX; ly = ev.clientY;
      render();
    }
    function upx(){
      stage.classList.remove('dragging');
      stage.removeEventListener('pointermove', mv);
      stage.removeEventListener('pointerup', upx);
      stage.removeEventListener('pointercancel', upx);
    }
    stage.addEventListener('pointermove', mv);
    stage.addEventListener('pointerup', upx);
    stage.addEventListener('pointercancel', upx);
  });

  function close(){
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({preventScroll:true}); } catch(_){} }
  }
  function onKey(e){ if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  on(overlay, 'click', function(e){ if (e.target === overlay) close(); });
  on($('.confirm-cancel', overlay), 'click', close);
  on($('.crop-reset', overlay), 'click', function(){ crop = { x: 0, y: 0, z: 1 }; zoom.value = 1; render(); });
  on($('.crop-save', overlay), 'click', function(){
    var prev = tok.dataset.crop || '';
    applyTokenCrop(tok, crop);
    if ((tok.dataset.crop || '') !== prev){
      pushHistory({ type: 'crop', itemId: ensureId(tok, 'tok'), prev: prev });
      scheduleSave();
      live('Image adjusted');
    }
    close();
  });
  setTimeout(function(){ try { stage.focus({preventScroll:true}); } catch(_){} }, 30);
}
window.openCropEditor = openCropEditor;

// Convert an external image URL to a data URL so it survives a refresh
// (persisted inline) and exports cleanly (no tainted canvas). Falls back to
// the original URL if the fetch is blocked by CORS, fails, or takes longer
// than `timeoutMs` (a stalled connection must never lose the image).
// opts.cache: 'default' reuses the browser cache (search thumbnails were just
// loaded with CORS); arbitrary pasted URLs revalidate ('no-cache').
function inlineImageSrc(src, cb, opts){
  opts = opts || {};
  if (typeof src !== 'string' || src.indexOf('data:') === 0) { cb(src); return; }
  var done = false;
  function finish(v){ if (done) return; done = true; clearTimeout(timer); cb(v); }
  var ctl = (typeof AbortController === 'function') ? new AbortController() : null;
  var timer = setTimeout(function(){ if (ctl) ctl.abort(); finish(src); }, opts.timeoutMs || 15000);
  try {
    fetch(src, { mode: 'cors', cache: opts.cache || 'no-cache', signal: ctl ? ctl.signal : undefined })
      .then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.blob(); })
      .then(function(blob){
        var reader = new FileReader();
        reader.onload = function(ev){ finish(ev.target.result); };
        reader.onerror = function(){ finish(src); };
        reader.readAsDataURL(blob);
      })
      .catch(function(){ finish(src); });
  } catch(e){ finish(src); }
}
// A readable name for an image that came from a URL ("golden-retriever").
function altFromUrl(url){
  try {
    var seg = decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || '');
    seg = seg.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/^\d+px-/, '').replace(/[_+-]+/g, ' ').trim();
    return seg.slice(0, 40) || 'Image';
  } catch(e){ return 'Image'; }
}
// Build an image token from a remote URL and show it right away (the browser
// usually has it cached already), then quietly swap in an inlined copy so it
// persists and exports. Nothing waits on the network.
function buildRemoteImageToken(url, alt, opts){
  var tok = buildImageToken(url, alt || altFromUrl(url));
  tok.classList.add('img-pending');
  inlineImageSrc(url, function(finalSrc){
    tok.classList.remove('img-pending');
    var img = tok.querySelector('img');
    if (img && finalSrc && finalSrc !== img.src) img.src = finalSrc;
    scheduleSave();
  }, opts);
  return tok;
}
window.buildRemoteImageToken = buildRemoteImageToken;
window.inlineImageSrc = inlineImageSrc;

/* ---------- History (Undo) ---------- */
var historyStack = []; // {itemId, fromId, toId, originBeforeId} or {type:'delete', element, parentId, beforeId}
var HISTORY_MAX = 50;  // bound retention (deletion entries hold detached DOM nodes)
function pushHistory(entry){
  historyStack.push(entry);
  if (historyStack.length > HISTORY_MAX) historyStack.shift();
  var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0;
}
function recordPlacement(itemId, fromId, toId, originBeforeId, extra){
  if (!fromId || !toId) return;
  // Quadrant pins can move meaningfully within one zone (position change),
  // so same-zone entries are kept when the exact prior coords are recorded.
  if (fromId===toId && !(extra && (extra.isQuadrant || extra.isReorder))) return;
  var entry = {itemId:itemId, fromId:fromId, toId:toId, originBeforeId: originBeforeId||''};
  if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) entry[k] = extra[k];
  pushHistory(entry);
}
function recordDeletion(element, parentEl, nextSibling){
  var parentId = ensureId(parentEl, 'zone');
  var beforeId = nextSibling ? ensureId(nextSibling, 'tok') : '';
  pushHistory({type:'delete', element:element, parentId:parentId, beforeId:beforeId});
}
function syncUndoBtn(){ var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0; }
// Apply one history entry. Returns true only if something actually changed,
// so stale entries (e.g. moves into tiers that no longer exist) are skipped
// instead of producing a misleading "Undone".
function applyUndo(last){
  // Prompt rebuilt the tiers — put the old rows (and their tokens) back
  if (last.type === 'rebuild') {
    $$('.tier-row', board).forEach(function(r){ r.remove(); });
    last.oldRows.forEach(function(r){ board.appendChild(r); });
    last.homes.forEach(function(h){ if (h.token.parentElement === tray) h.drop.appendChild(h.token); });
    var titleEl = $('.board-title');
    if (titleEl){
      titleEl.textContent = last.oldTitle || '';
      if (titleEl.textContent.trim()){ _promptUserSet = true; hidePromptStack(); }
      else {
        _promptUserSet = false;
        // Only the tier list shows the prompt stack
        if (typeof window.currentChartMode !== 'function' || window.currentChartMode() === 'tier') showPromptStack();
      }
    }
    uniformizeTierLabels(); refreshRadialOptions(); scheduleSave();
    live('Restored previous tiers');
    return true;
  }
  // Image crop — restore the previous framing
  if (last.type === 'crop') {
    var ct = document.getElementById(last.itemId);
    if (!ct) return false;
    applyTokenCrop(ct, last.prev || null);
    scheduleSave();
    live('Image framing restored');
    return true;
  }
  // Tier-row deletion — re-insert the row and pull its tokens back
  if (last.type === 'deleteRow') {
    var beforeRow = last.beforeId ? document.getElementById(last.beforeId) : null;
    if (beforeRow && beforeRow.parentElement === board) board.insertBefore(last.element, beforeRow);
    else board.appendChild(last.element);
    var rowDrop = last.element.querySelector('.tier-drop');
    if (rowDrop && last.tokens && last.tokens.length) {
      // Only reclaim tokens still sitting in the tray — anything the user has
      // since re-placed or deleted stays where it is.
      var back = last.tokens.filter(function(t){ return t && t.parentElement === tray; });
      if (back.length) flipZones([tray, rowDrop], function(){ back.forEach(function(t){ rowDrop.appendChild(t); }); });
    }
    uniformizeTierLabels(); refreshRadialOptions(); scheduleSave();
    live('Restored deleted tier');
    return true;
  }
  // Quadrant placement — remove the pin, unhide the tray token
  if (last.type === 'qplace') {
    var qpin = document.getElementById(last.pinId);
    if (!qpin || typeof window.qRemovePinSilent !== 'function') return false;
    window.qRemovePinSilent(qpin);
    live('Removed pin from quadrant chart');
    return true;
  }
  // Deletion — re-insert the removed element
  if (last.type === 'delete') {
    var parent = document.getElementById(last.parentId);
    if (!parent) return false;
    var before = last.beforeId ? document.getElementById(last.beforeId) : null;
    if (before && before.parentElement === parent) parent.insertBefore(last.element, before);
    else parent.appendChild(last.element);
    scheduleSave();
    live('Restored deleted token');
    return true;
  }
  // Placement
  var item = document.getElementById(last.itemId);
  var origin = document.getElementById(last.fromId);
  if (!item || !origin || !document.contains(origin)) return false;
  var scrollSnap = window.pageYOffset;
  flipZones([item.parentElement, origin], function(){
    var b = last.originBeforeId ? document.getElementById(last.originBeforeId) : null;
    if (b && b.parentElement === origin) origin.insertBefore(item, b);
    else origin.appendChild(item);
    // Quadrant pins are absolutely positioned within their zone — restore the
    // exact left/top they had before the move, otherwise they land in the
    // wrong spot using the drop coordinates.
    if (last.prevLeft != null){ item.style.left = last.prevLeft; item.style.top = last.prevTop || ''; }
  });
  // Prevent viewport shift on mobile after DOM move
  if (isSmall()) window.scrollTo(0, scrollSnap);
  if (last.isQuadrant){
    if (typeof window.bringQTokenToFront === 'function') window.bringQTokenToFront(item);
    if (typeof window.scheduleQuadrantSave === 'function') window.scheduleQuadrantSave();
  }
  live('Moved "'+tokenName(item)+'" back');
  return true;
}
function undoLast(){
  var done = false;
  while (!done && historyStack.length) done = applyUndo(historyStack.pop());
  syncUndoBtn();
  return done;
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
    // In quadrant mode, let the quadrant-specific handler manage placement
    if(typeof window.currentChartMode === 'function' && window.currentChartMode() === 'quadrant' && zone.classList.contains('q-zone')) return;
    var picker=$('#radialPicker'); if(picker && !picker.classList.contains('hidden')) return;
    var selected = $('.token.selected'); if (!selected) return;
    if(isSmall() && !selected.closest('#tray')) return;
    var fromId = ensureId(selected.parentElement,'zone'); if(fromId===zone.id) return;
    var origin = selected.parentElement;
    var originNext = selected.nextElementSibling;
    var originBeforeId = originNext ? ensureId(originNext,'tok') : '';
    var scrollSnap = window.pageYOffset;
    var isQZone = zone.classList.contains('q-zone');
    flipZones([origin, zone], function(){ zone.appendChild(selected); });
    // Clear absolute positioning when returning to tray or tier row
    if(!isQZone){ selected.style.position=''; selected.style.left=''; selected.style.top=''; }
    // Prevent viewport shift on mobile after DOM move
    if (isSmall()) window.scrollTo(0, scrollSnap);
    selected.classList.remove('selected');
    recordPlacement(selected.id, fromId, zone.id, originBeforeId);
    var r = zone.closest ? zone.closest('.tier-row') : null;
    live('Moved "'+tokenName(selected)+'" to '+ (r?rowLabel(r): isQZone?'quadrant chart':'Image Storage') );
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

/* ---------- Auto-scroll during drag ---------- */
var _autoScrollEdge = 80;   // px from viewport edge to start scrolling
var _autoScrollMax  = 18;   // max px per frame

function autoScrollForDrag(clientY, edge){
  var vh = window.innerHeight;
  edge = edge || _autoScrollEdge;
  if (clientY < edge) {
    // Near top – scroll up; speed proportional to proximity
    var t = 1 - clientY / edge;           // 0 at threshold, 1 at edge
    window.scrollBy(0, -Math.round(_autoScrollMax * t * t));
  } else if (clientY > vh - edge) {
    // Near bottom – scroll down
    var t = 1 - (vh - clientY) / edge;
    window.scrollBy(0, Math.round(_autoScrollMax * t * t));
  }
}
// Touch drags use a slimmer edge (a phone screen is short) and only start
// auto-scrolling once the finger has actually moved after lifting.
var _touchAutoScrollEdge = 56;

/* ---------- Pointer drag (desktop / large screens) ---------- */
function enablePointerDrag(node){
  var ghost=null, originParent=null, originNext=null, currentZone=null;
  var offsetX=0, offsetY=0, x=0, y=0, raf=null;

  on(node,'pointerdown', function(e){
    if (isSmall()) return;
    if (e.button!==0) return;
    // Presses on the token's own buttons (delete / adjust) are clicks, not
    // drags — capturing the pointer here would retarget their click to the
    // token and they'd never fire.
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    // preventDefault suppresses the browser's click-focus — restore it so
    // keyboard users who mix in mouse clicks keep a sensible focus position.
    try { node.focus({preventScroll:true}); } catch(_){ }
    node.setPointerCapture(e.pointerId);

    originParent = node.parentElement; originNext = node.nextElementSibling;
    var r=node.getBoundingClientRect(); offsetX=e.clientX-r.left; offsetY=e.clientY-r.top; x=e.clientX; y=e.clientY;

    // Deferred drag start: the ghost/hide chrome only appears after real
    // movement. Hiding the token on pointerdown set pointer-events:none, so a
    // plain click's mouseup hit-tested to the tray and the click never
    // reached the token — selection on desktop was dead.
    var started = false;
    function startDrag(){
      started = true;
      document.body.classList.add('dragging-item');
      ghost = node.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.appendChild(ghost);
      node.classList.add('drag-hidden');
      loop();
    }

    function move(ev){
      x=ev.clientX; y=ev.clientY;
      if(!started && Math.hypot(x - e.clientX, y - e.clientY) > 4) startDrag();
    }
    function detach(){
      try{ node.releasePointerCapture(e.pointerId); }catch(_){}
      document.removeEventListener('pointermove', move, _supportsPassive?{passive:true}:false);
      document.removeEventListener('pointerup', up, false);
      document.removeEventListener('pointercancel', cancel, false);
    }
    // The system took the pointer away mid-drag — drop the ghost, never move
    function cancel(){
      detach();
      if (!started) return;
      cancelAnimationFrame(raf);
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      node.classList.remove('drag-hidden');
      document.body.classList.remove('dragging-item');
      if (currentZone) currentZone.classList.remove('drag-over');
      currentZone = null;
    }
    function up(){
      detach();
      if (!started) return; // plain click — let the click event handle selection
      // The click that follows a real drag must not toggle selection
      node._suppressClick = true; setTimeout(function(){ node._suppressClick = false; }, 400);
      cancelAnimationFrame(raf);
      var target = document.elementFromPoint(x,y);
      var zonePreview = getDropZoneFromElement(target);
      if (!zonePreview && ghost && ghost.parentNode) {
        // Snap-back animation: tween ghost toward original tile before removing
        var orect = node.getBoundingClientRect();
        ghost.style.setProperty('--snap-x', (orect.left - (x - offsetX)) + 'px');
        ghost.style.setProperty('--snap-y', (orect.top  - (y - offsetY)) + 'px');
        ghost.classList.add('snap-back');
        var gh = ghost;
        setTimeout(function(){ if (gh && gh.parentNode) gh.parentNode.removeChild(gh); }, 240);
        ghost = null;
      } else if (ghost && ghost.parentNode) {
        ghost.parentNode.removeChild(ghost);
      }
      node.classList.remove('drag-hidden');
      document.body.classList.remove('dragging-item');

      var zone = zonePreview;
      if (zone){
        var fromId = ensureId(originParent,'zone');
        var toId   = ensureId(zone,'zone');
        var originBeforeId = originNext ? ensureId(originNext,'tok') : '';
        var isQZone = zone.classList.contains('q-zone');
        if(isQZone){
          // Quadrant zone: clone token as pin, hide original in tray
          var qClone = typeof window.cloneTokenForQuadrant === 'function' ? window.cloneTokenForQuadrant(node) : null;
          var placed = qClone || node;
          zone.appendChild(placed);
          if(typeof window.qPlacePinAt === 'function'){
            // Shared placement: dot-anchor, clamp to true pin width, de-overlap
            window.qPlacePinAt(zone, placed, x, y);
          } else {
            var rect = zone.getBoundingClientRect();
            var pinH = 26;
            var nx = Math.max(0,Math.min(x - rect.left - 11, rect.width-60));
            var ny = Math.max(0,Math.min(y - rect.top - pinH/2, rect.height-pinH));
            placed.style.position = 'absolute';
            placed.style.left = (nx/rect.width*100)+'%';
            placed.style.top = (ny/rect.height*100)+'%';
          }
          if(typeof window.bringQTokenToFront==='function') window.bringQTokenToFront(placed);
          // Hide original in tray
          if(qClone){
            flipZones([originParent], function(){
              if(originNext && originNext.parentElement===originParent) originParent.insertBefore(node, originNext);
              else originParent.appendChild(node);
            });
            node.classList.add('q-placed-hidden');
            pushHistory({type:'qplace', pinId: placed.id});
          }
        } else {
          var beforeTok = insertBeforeForPoint(zone,x,y,node);
          flipZones([originParent, zone], function(){
            if(beforeTok) zone.insertBefore(node, beforeTok); else zone.appendChild(node);
          });
          // Clear any leftover absolute positioning from quadrant
          node.style.position = '';
          node.style.left = '';
          node.style.top = '';
        }
        if(!isQZone) recordPlacement(node.id, fromId, toId, originBeforeId);
        node.classList.add('animate-drop'); setTimeout(function(){ node.classList.remove('animate-drop'); },180);
        var rr = zone.closest ? zone.closest('.tier-row') : null;
        live('Moved "'+tokenName(node)+'" to '+ (rr?rowLabel(rr): isQZone?'quadrant chart':'Image Storage') );
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
    document.addEventListener('pointercancel', cancel, false);

    var _lhx=null, _lhy=null;
    function loop(){
      raf = requestAnimationFrame(loop);
      autoScrollForDrag(y);
      // Skip the hit-test + ghost write entirely when the pointer hasn't
      // moved since last frame — elementFromPoint forces layout, so this
      // avoids needless reflows while the finger/cursor is still.
      if (x===_lhx && y===_lhy) return;
      _lhx=x; _lhy=y;
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
    var zonePreview2 = getDropZoneFromElement(target);
    if (!zonePreview2 && ghost && ghost.parentNode) {
      var orect2 = node.getBoundingClientRect();
      ghost.style.setProperty('--snap-x', (orect2.left - (x - offsetX)) + 'px');
      ghost.style.setProperty('--snap-y', (orect2.top  - (y - offsetY)) + 'px');
      ghost.classList.add('snap-back');
      var gh2 = ghost;
      setTimeout(function(){ if (gh2 && gh2.parentNode) gh2.parentNode.removeChild(gh2); }, 240);
      ghost = null;
    } else if (ghost && ghost.parentNode) {
      ghost.parentNode.removeChild(ghost);
    }
    node.classList.remove('drag-hidden');
    document.body.classList.remove('dragging-item');
    var zone=zonePreview2;
    if (zone){
      var fromId=ensureId(originParent,'zone'), toId=ensureId(zone,'zone');
      var originBeforeId = originNext ? ensureId(originNext,'tok') : '';
      var isQZone = zone.classList.contains('q-zone');
      if(isQZone){
        var qClone2 = typeof window.cloneTokenForQuadrant === 'function' ? window.cloneTokenForQuadrant(node) : null;
        var placed2 = qClone2 || node;
        var rect = zone.getBoundingClientRect();
        var pinH = 20;
        var nx = x - rect.left - 6;
        var ny = y - rect.top - pinH/2;
        if(typeof window.clampQPosition==='function'){
          var cl2=window.clampQPosition(nx,ny,rect.width,rect.height,pinH,zone);nx=cl2.x;ny=cl2.y;
        } else { nx=Math.max(0,Math.min(nx,rect.width-60));ny=Math.max(0,Math.min(ny,rect.height-pinH)); }
        zone.appendChild(placed2);
        placed2.style.position = 'absolute';
        placed2.style.left = (nx/rect.width*100)+'%';
        placed2.style.top = (ny/rect.height*100)+'%';
        if(typeof window.bringQTokenToFront==='function') window.bringQTokenToFront(placed2);
        if(qClone2){
          flipZones([originParent], function(){
            if(originNext && originNext.parentElement===originParent) originParent.insertBefore(node, originNext);
            else originParent.appendChild(node);
          });
          node.classList.add('q-placed-hidden');
          pushHistory({type:'qplace', pinId: placed2.id});
        }
      } else {
        var beforeTok=insertBeforeForPoint(zone,x,y,node);
        flipZones([originParent, zone], function(){
          if(beforeTok) zone.insertBefore(node,beforeTok); else zone.appendChild(node);
        });
        node.style.position = '';
        node.style.left = '';
        node.style.top = '';
      }
      if(!isQZone) recordPlacement(node.id, fromId, toId, originBeforeId);
      node.classList.add('animate-drop'); setTimeout(function(){ node.classList.remove('animate-drop'); },180);
      var rr = zone.closest ? zone.closest('.tier-row') : null;
      live('Moved "'+tokenName(node)+'" to '+ (rr?rowLabel(rr): isQZone?'quadrant chart':'Image Storage') );
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

  on(node,'mousedown', function(e){ if(e.button!==0) return; if(e.target.closest && e.target.closest('button')) return; start(e,e.clientX,e.clientY);
    on(document,'mousemove', onMouseMove); on(document,'mouseup', onMouseUp); });
  function onMouseMove(e){ move(e.clientX,e.clientY); }
  function onMouseUp(){ document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); end(); }

  on(node,'touchstart', function(e){ var t=e.touches[0]; if(!t) return; start(e,t.clientX,t.clientY);
    on(document,'touchmove', onTouchMove, _supportsPassive?{passive:true}:false);
    on(document,'touchend', onTouchEnd, false); }, _supportsPassive?{passive:false}:false);
  function onTouchMove(e){ var t=e.touches[0]; if(t) move(t.clientX,t.clientY); }
  function onTouchEnd(){ document.removeEventListener('touchmove', onTouchMove, false); document.removeEventListener('touchend', onTouchEnd, false); end(); }

  var _lhx=null, _lhy=null;
  function loop(){
    raf=requestAnimationFrame(loop);
    autoScrollForDrag(y);
    if (x===_lhx && y===_lhy) return;
    _lhx=x; _lhy=y;
    ghost.style.transform='translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';
    var el=document.elementFromPoint(x,y);
    var zone=getDropZoneFromElement(el);
    if (currentZone && currentZone!==zone) currentZone.classList.remove('drag-over');
    if (zone && zone!==currentZone) zone.classList.add('drag-over');
    currentZone = zone || null;
  }
}

/* ---------- Mobile touch drag for placed tokens ----------
   Press-and-hold (~220ms) lifts a placed token. A finger that starts moving
   before that is a scroll and is left entirely to the browser (tokens are
   touch-action:pan-y on phones). Once lifted, a non-passive touchmove
   listener stops the page from panning under the drag. A plain tap falls
   through to the click handler (which opens the picker). */
var TOUCH_HOLD_MS = 220;
function enableMobileTouchDrag(node){
  if(!('PointerEvent' in window)) return;
  var armed = false;
  // Registered up front (not mid-gesture) and non-passive, so it can cancel
  // native panning once the hold has lifted the token.
  node.addEventListener('touchmove', function(ev){ if(armed && ev.cancelable) ev.preventDefault(); }, {passive:false});
  // Long-press must not open the browser's context menu / callout
  on(node,'contextmenu', function(ev){ if(isSmall()) ev.preventDefault(); });

  on(node,'pointerdown',function(e){
    if(!isSmall())return;
    if(e.pointerType!=='touch' && e.pointerType!=='pen')return;
    if(!node.closest('.tier-drop'))return;
    if(e.target.closest && e.target.closest('button'))return;

    var pid=e.pointerId, sx=e.clientX, sy=e.clientY, x=sx, y=sy;
    var ghost=null, originParent=null, originNext=null, offsetX=0, offsetY=0;
    var lastInsertZone=null, lastInsertBefore=null, raf=null;
    var liftX=0, liftY=0, dragMoved=false;
    var holdTimer=setTimeout(lift, TOUCH_HOLD_MS);

    function lift(){
      if(!node.isConnected){ detach(); return; }
      armed=true;
      liftX=x; liftY=y; dragMoved=false;
      try{ node.setPointerCapture(pid); }catch(_){}
      document.body.classList.add('dragging-item');
      originParent=node.parentElement; originNext=node.nextElementSibling;
      var r=node.getBoundingClientRect(); offsetX=x-r.left; offsetY=y-r.top;
      ghost=node.cloneNode(true); ghost.classList.add('drag-ghost');
      ghost.style.width=r.width+'px'; ghost.style.height=r.height+'px';
      // Place the ghost over the token immediately (no flash at 0,0)
      ghost.style.transform='translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';
      document.body.appendChild(ghost);
      // Placeholder gap where the token was + smooth sibling animation
      node.classList.add('drag-hidden');
      originParent.classList.add('reorder-active');
      vib(10);
      loop();
    }
    // Reordering inside the token's own tier happens live. Crossing into
    // another tier only highlights it and moves the token on release —
    // moving it live would shrink/grow rows and slide the target out from
    // under a still finger.
    var targetZone=null;
    function setTarget(zone){
      if(targetZone && targetZone!==zone && targetZone!==originParent) targetZone.classList.remove('drag-over');
      if(zone && zone!==originParent) zone.classList.add('drag-over');
      targetZone=zone||null;
    }
    function updateTarget(){
      // Hit-test through the ghost
      ghost.style.pointerEvents='none';
      var el=document.elementFromPoint(x,y);
      ghost.style.pointerEvents='';
      var zone=el?getDropZoneFromElement(el):null;
      if(zone && zone.classList.contains('q-zone')) zone=null;
      if(zone!==targetZone){ setTarget(zone); if(zone) vib(4); }
      if(zone && zone===originParent){
        var beforeTok=insertBeforeForPoint(zone,x,y,node);
        if(beforeTok!==lastInsertBefore || lastInsertZone!==zone){
          if(beforeTok) zone.insertBefore(node,beforeTok); else zone.appendChild(node);
          lastInsertZone=zone; lastInsertBefore=beforeTok;
        }
      }
    }
    // rAF loop drives edge auto-scroll (a finger held near a screen edge fires
    // no pointermove) and re-hit-tests when the page scrolls under it.
    var _lhx=null, _lhy=null, _lsY=window.pageYOffset;
    function loop(){
      raf=requestAnimationFrame(loop);
      if(dragMoved) autoScrollForDrag(y, _touchAutoScrollEdge);
      var sy2=window.pageYOffset;
      if(x===_lhx && y===_lhy && sy2===_lsY) return;
      _lhx=x; _lhy=y; _lsY=sy2;
      updateTarget();
    }
    function move(ev){
      if(ev.pointerId!==pid) return;
      x=ev.clientX; y=ev.clientY;
      if(!armed){
        // Moved before the hold completed → it's a scroll, not a drag
        if(Math.hypot(x-sx,y-sy)>8){ clearTimeout(holdTimer); detach(); }
        return;
      }
      if(!dragMoved && Math.hypot(x-liftX,y-liftY)>10) dragMoved=true;
      ghost.style.transform='translate3d('+(x-offsetX)+'px,'+(y-offsetY)+'px,0)';
    }
    function detach(){
      document.removeEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
      document.removeEventListener('pointerup',up,false);
      document.removeEventListener('pointercancel',cancel,false);
    }
    function finish(commit){
      clearTimeout(holdTimer);
      detach();
      if(!armed) return; // tap (click handles it) or a scroll the browser owns
      armed=false;
      cancelAnimationFrame(raf);
      // Final hit test at the release point — the finger can lift before the
      // next animation frame has looked at its last position.
      if(commit && ghost) updateTarget();
      try{node.releasePointerCapture(pid);}catch(_){}
      if(ghost&&ghost.parentNode)ghost.parentNode.removeChild(ghost);
      node.classList.remove('drag-hidden');
      document.body.classList.remove('dragging-item');
      $$('.reorder-active').forEach(function(z){ z.classList.remove('reorder-active'); });
      // Swallow the click that follows the release
      node._suppressClick=true; setTimeout(function(){ node._suppressClick=false; },400);

      var dropZone=targetZone;
      setTarget(null);
      // Cross-tier drop: move now, at the release point
      if(commit && dropZone && dropZone!==originParent){
        var bt=insertBeforeForPoint(dropZone,x,y,node);
        flipZones([originParent, dropZone], function(){ if(bt) dropZone.insertBefore(node,bt); else dropZone.appendChild(node); });
      }
      var currentParent=node.parentElement;
      var moved=currentParent!==originParent || node.nextElementSibling!==originNext;
      if(commit && moved){
        var fromId=ensureId(originParent,'zone'), toId=ensureId(currentParent,'zone');
        var originBeforeId=originNext?ensureId(originNext,'tok'):'';
        // Same-zone reorders are recorded as a from==to placement
        if(fromId===toId) recordPlacement(node.id,fromId,fromId,originBeforeId,{isReorder:true});
        else recordPlacement(node.id,fromId,toId,originBeforeId);
        node.classList.add('animate-drop'); setTimeout(function(){node.classList.remove('animate-drop');},180);
        var rr=node.closest('.tier-row'); live('Moved "'+tokenName(node)+'" to '+(rr?rowLabel(rr):'Image Storage'));
        vib(6);
      } else {
        // Cancelled (system gesture, call, …) or no change: put it back exactly
        if(originNext&&originNext.parentElement===originParent)originParent.insertBefore(node,originNext);
        else originParent.appendChild(node);
      }
    }
    function up(ev){ if(ev.pointerId!==pid) return; x=ev.clientX; y=ev.clientY; finish(true); }
    function cancel(ev){ if(ev.pointerId===pid) finish(false); }
    document.addEventListener('pointermove',move,_supportsPassive?{passive:true}:false);
    document.addEventListener('pointerup',up,false);
    document.addEventListener('pointercancel',cancel,false);
  });
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
  function disarm(){
    // A native dragstart never fired (plain click/release) — clear the
    // draggable flag so it can't hijack later text selection or editing.
    if (!_rowPlaceholder) row.removeAttribute('draggable');
  }
  on(labelArea,'mousedown', arm);
  on(labelArea,'touchstart', arm, _supportsPassive?{passive:true}:false);
  on(labelArea,'mouseup', disarm);
  on(labelArea,'mouseleave', disarm);
  on(labelArea,'touchend', disarm);
  on(labelArea,'touchcancel', disarm);

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

  /* Touch path — HTML5 drag-and-drop doesn't exist on mobile. Long-press the
     tier label (350ms without moving) to lift the row, then drag vertically;
     rows swap live with a small FLIP animation. */
  if (window.PointerEvent) {
    // Tier labels are touch-action:pan-y so the page scrolls from them; once
    // the long-press lifts a row, this (non-passive, registered up front)
    // listener stops the page panning under the drag.
    labelArea.addEventListener('touchmove', function(ev){
      if (labelArea._rowArmed && ev.cancelable) ev.preventDefault();
    }, {passive:false});
    on(labelArea,'pointerdown', function(e){
      if (!isSmall()) return;
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      var chip = $('.label-chip', row);
      if (document.activeElement === chip) return;
      if (e.target.closest('.row-del') || e.target.closest('.color-pick-btn')) return;

      var startX = e.clientX, startY = e.clientY, lastY = e.clientY;
      var armed = false, pid = e.pointerId, raf = null;
      var timer = setTimeout(function(){
        armed = true;
        labelArea._rowArmed = true;
        vib(12);
        row.classList.add('row-lifted');
        document.body.classList.add('dragging-item');
        try { labelArea.setPointerCapture(pid); } catch(_){}
        loop();
      }, 350);

      function flipRows(mutate){
        var allRows = $$('.tier-row', board), prev = new Map();
        allRows.forEach(function(r){ prev.set(r, r.getBoundingClientRect().top); });
        mutate();
        allRows.forEach(function(r){
          if (r === row) return;
          var dy = prev.get(r) - r.getBoundingClientRect().top;
          if (dy){
            r.style.transition = 'none'; r.style.transform = 'translateY('+dy+'px)';
            requestAnimationFrame(function(){
              r.style.transition = 'transform 160ms ease'; r.style.transform = '';
              setTimeout(function(){ r.style.transition = ''; }, 220);
            });
          }
        });
      }
      function loop(){
        raf = requestAnimationFrame(loop);
        if (Math.abs(lastY - startY) > 10) autoScrollForDrag(lastY, _touchAutoScrollEdge);
      }
      function move(ev){
        lastY = ev.clientY;
        if (!armed){
          // Finger wandered before the long-press fired — treat as scroll/tap
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8){ clearTimeout(timer); cleanup(false); }
          return;
        }
        ev.preventDefault();
        var after = _rowAfterY(board, ev.clientY);
        if (after === row || after === row.nextElementSibling) return;
        flipRows(function(){
          if (after) board.insertBefore(row, after); else board.appendChild(row);
        });
        vib(4);
      }
      function upOrCancel(){
        clearTimeout(timer);
        cleanup(armed);
      }
      function cleanup(commit){
        labelArea._rowArmed = false;
        cancelAnimationFrame(raf);
        document.removeEventListener('pointermove', move, {passive:false});
        document.removeEventListener('pointerup', upOrCancel);
        document.removeEventListener('pointercancel', upOrCancel);
        try { labelArea.releasePointerCapture(pid); } catch(_){}
        row.classList.remove('row-lifted');
        document.body.classList.remove('dragging-item');
        if (commit){
          scheduleSave(); vib(6);
          live('Moved tier "'+rowLabel(row)+'"');
        }
      }
      document.addEventListener('pointermove', move, {passive:false});
      document.addEventListener('pointerup', upOrCancel);
      document.addEventListener('pointercancel', upOrCancel);
    });
  }
}

/* ---------- Radial picker (mobile) ---------- */
var radial = $('#radialPicker');
var radialOpts = radial?$('.radial-options', radial):null;
var radialCloseBtn = radial?$('.radial-close', radial):null;
var radialForToken = null;
var _radialGeo = [];
var _savedScrollY = null;
var _radialLastFocus = null;

function rowCount(){ return $$('.tier-row').length; }
function refreshRadialOptions(){
  if (!isSmall() || !radial || !radialForToken) return;
  openRadial(radialForToken);
}

/* Picker header: a small preview of the token being placed + its name, so
   it's always clear what the tier buttons will act on. */
function buildRadialHead(token, verb){
  var head = document.createElement('div');
  head.className = 'radial-head';
  var chip = document.createElement('span');
  chip.className = 'radial-head-token';
  var img = token && token.querySelector('img');
  if (img){
    var pi = document.createElement('img');
    pi.src = img.src; pi.alt = ''; pi.draggable = false;
    if (img.style.transform) pi.style.transform = img.style.transform;
    chip.appendChild(pi);
  } else if (token){
    chip.style.background = token.style.background || 'var(--token-default)';
    var lbl = token.querySelector('.label');
    if (lbl) chip.style.color = lbl.style.color || '';
    chip.textContent = tokenName(token).slice(0, 2);
  }
  var txt = document.createElement('span');
  txt.className = 'radial-head-text';
  var v = document.createElement('span'); v.className = 'radial-head-verb'; v.textContent = verb;
  var n = document.createElement('strong'); n.textContent = tokenName(token);
  txt.appendChild(v); txt.appendChild(n);
  head.appendChild(chip); head.appendChild(txt);
  return head;
}
window.buildRadialHead = buildRadialHead;
function addRadialAction(label, cls, delayIdx, onClick){
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'radial-option radial-btn radial-action ' + cls;
  b.style.transitionDelay = (delayIdx * 20) + 'ms';
  var d = document.createElement('span');
  d.className = 'dot';
  d.textContent = label;
  b.appendChild(d);
  on(b, 'click', onClick);
  radialOpts.appendChild(b);
  return b;
}

function openRadial(token){
  if(!radial||!isSmall()) return;
  // Remove existing backdrop handler to prevent listener leaks on re-open
  if(radial._backdropHandler){
    radial.removeEventListener('pointerdown', radial._backdropHandler);
    delete radial._backdropHandler;
  }
  // Remember the trigger so focus can return when the picker closes
  if (!_radialLastFocus) _radialLastFocus = document.activeElement;
  radialForToken = token;

  // Save scroll position to prevent drift
  if (_savedScrollY === null) _savedScrollY = window.pageYOffset;

  var rows = $$('.tier-row');
  var N = rows.length; if (!N) return;
  var currentRow = token && token.closest ? token.closest('.tier-row') : null;

  _radialGeo = [];

  // The options container is a centered, scrollable column (CSS .radial-list)
  // so boards with many tiers never push options off-screen — they scroll.
  radialOpts.innerHTML = '';
  radialOpts.appendChild(buildRadialHead(token, currentRow ? 'Move' : 'Place'));
  rows.forEach(function(row, j){
    var chipEl = row.querySelector('.label-chip');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'radial-option radial-btn';
    btn.style.transitionDelay = (j * 20) + 'ms';

    var dot = document.createElement('span');
    dot.className = 'dot';
    dot.textContent = rowLabel(row);
    paintTierChip(dot, chipEl && chipEl.dataset.color ? chipEl.dataset.color : '#8b7dff');
    btn.appendChild(dot);
    if (row === currentRow){
      btn.classList.add('is-current');
      btn.setAttribute('aria-current', 'true');
      btn.setAttribute('aria-label', rowLabel(row) + ' (current tier)');
    }

    function makeHot(){ updateHighlight(j); }
    on(btn, 'pointerenter', makeHot);
    on(btn, 'pointerdown', makeHot);
    on(btn, 'click', function(){ selectRadialTarget(row); });

    radialOpts.appendChild(btn);
    _radialGeo.push({ row: row, btn: btn });
  });

  var extra = N;
  // Placed tokens can go back to storage by tap
  if (currentRow){
    addRadialAction('Back to storage', 'radial-back', extra++, function(){
      var tok = radialForToken;
      closeRadial();
      if (!tok || !tok.parentElement) return;
      var origin = tok.parentElement, next = tok.nextElementSibling;
      var fromId = ensureId(origin, 'zone');
      var scrollSnap = window.pageYOffset;
      flipZones([origin, tray], function(){ tray.insertBefore(tok, tray.firstChild); });
      window.scrollTo(0, scrollSnap);
      tok.classList.remove('selected');
      recordPlacement(tok.id, fromId, ensureId(tray, 'zone'), next ? ensureId(next, 'tok') : '');
      live('Moved "'+tokenName(tok)+'" to Image Storage');
      vib(7);
    });
  }
  // Image tokens: reposition / zoom the circular crop
  if (token && token.querySelector('img') && typeof window.openCropEditor === 'function'){
    addRadialAction('Adjust image', 'radial-adjust', extra++, function(){
      var tok = radialForToken;
      closeRadial();
      if (tok) window.openCropEditor(tok);
    });
  }
  // Custom tokens get an explicit Delete action
  if (token && token.dataset && token.dataset.custom === 'true'){
    addRadialAction('Delete', 'radial-delete', extra++, function(){
      var tok = radialForToken;
      closeRadial();
      if (!tok || !tok.parentElement) return;
      recordDeletion(tok, tok.parentElement, tok.nextElementSibling);
      tok.remove();
      scheduleSave();
      vib(10);
      live('Deleted "'+tokenName(tok)+'"');
    });
  }

  function backdrop(ev){
    if(ev.target.closest('.radial-option') || ev.target.closest('.radial-close') || ev.target.closest('.radial-options')) return;
    var x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
    var y = (ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY);
    var prevPE = radial.style.pointerEvents; radial.style.pointerEvents = 'none';
    var under = document.elementFromPoint(x, y); radial.style.pointerEvents = prevPE || 'auto';
    var other = under && under.closest && under.closest('#tray .token, .tier-drop .token');
    if(other && other !== radialForToken){
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
  setTimeout(function(){ radial.classList.remove('show'); }, 160 + extra * 20);
  if (_radialGeo.length){ updateHighlight(-1); _radialGeo[0].btn.focus({preventScroll:true}); }
}
function updateHighlight(index){
  if(!_radialGeo.length) return;
  for(var i = 0; i < _radialGeo.length; i++){
    _radialGeo[i].btn.classList.toggle('is-hot', i === index);
  }
}
if(radialCloseBtn){
  on(radialCloseBtn, 'click', function(e){ e.stopPropagation(); closeRadial(); }, false);
}
function selectRadialTarget(row){
  if (!radialForToken || !row) return;
  // The picker may have been open when its target tier was deleted — bail
  // instead of moving the token into a detached row.
  if (!document.contains(row)) { closeRadial(); return; }
  var zone = row.querySelector('.tier-drop');
  if (!zone) { closeRadial(); return; }
  // Already in this tier — nothing to move
  if (radialForToken.parentElement === zone) { radialForToken.classList.remove('selected'); closeRadial(); return; }
  var fromId = ensureId(radialForToken.parentElement, 'zone');
  var origin = radialForToken.parentElement; ensureId(zone, 'zone');
  var originNext = radialForToken.nextElementSibling;
  var originBeforeId = originNext ? ensureId(originNext, 'tok') : '';
  // Capture scroll before DOM mutation to prevent viewport shift
  var scrollSnap = window.pageYOffset;
  flipZones([origin, zone], function(){ zone.appendChild(radialForToken); });
  // Restore scroll immediately after DOM move
  window.scrollTo(0, scrollSnap);
  radialForToken.classList.remove('selected');
  recordPlacement(radialForToken.id, fromId, zone.id, originBeforeId);
  live('Moved "'+tokenName(radialForToken)+'" to '+rowLabel(row));
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
  // Clear old radial buttons so their event listeners can be garbage-collected
  var opts = radial.querySelector('.radial-options'); if(opts) opts.innerHTML = '';
  // Unlock body scroll and restore position - capture before unlocking
  var scrollY = _savedScrollY;
  _savedScrollY = null;
  document.body.classList.remove('radial-open');
  document.body.style.top = '';
  if (scrollY !== null){
    // Restore scroll synchronously and again after paint to prevent drift
    window.scrollTo(0, scrollY);
    requestAnimationFrame(function(){ window.scrollTo(0, scrollY); });
  }
  // Return focus to the element that opened the picker
  if (_radialLastFocus && typeof _radialLastFocus.focus === 'function'){
    try { _radialLastFocus.focus(); } catch(e){}
  }
  _radialLastFocus = null;
}
on(window, 'resize', refreshRadialOptions);

/* ---------- Custom confirm modal ---------- */
/* okLabel names the destructive action ("Clear", "Use Prompt", ...) */
function showConfirm(title, msg, onConfirm, okLabel){
  var overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  var card = document.createElement('div');
  card.className = 'confirm-card';

  var h = document.createElement('h3');
  h.className = 'confirm-title';
  h.textContent = title;

  var p = document.createElement('p');
  p.className = 'confirm-msg';
  p.textContent = msg;

  var actions = document.createElement('div');
  actions.className = 'confirm-actions';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn confirm-cancel';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';

  var okBtn = document.createElement('button');
  okBtn.className = 'btn confirm-ok';
  okBtn.type = 'button';
  okBtn.textContent = okLabel || 'Clear';

  actions.appendChild(cancelBtn);
  actions.appendChild(okBtn);
  card.appendChild(h);
  card.appendChild(p);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Always detach the Escape listener on close — no matter how the modal was
  // dismissed — so repeated confirms don't pile up document-level handlers.
  function close(){ overlay.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e){ if(e.key==='Escape') close(); }
  on(cancelBtn, 'click', close);
  on(overlay, 'click', function(e){ if(e.target === overlay) close(); });
  on(okBtn, 'click', function(){
    if (okBtn.classList.contains('arming')) return;
    close(); onConfirm();
  });
  document.addEventListener('keydown', onKey);
  // Safety: destructive OK button is disabled for 400ms so a double-Enter can't nuke the board
  okBtn.classList.add('arming');
  okBtn.disabled = true;
  setTimeout(function(){
    okBtn.classList.remove('arming');
    okBtn.disabled = false;
    okBtn.focus();
  }, 400);
  cancelBtn.focus();
}

/* ---------- Clear / Undo ---------- */
on($('#trashClear'),'click', function(){
  // Battles mode: restart same category from round 1
  if(typeof window.isBattleMode === 'function' && window.isBattleMode()){
    if(typeof window.restartBattle === 'function') window.restartBattle();
    return;
  }
  var isQ = (typeof window.currentChartMode === 'function' && window.currentChartMode() === 'quadrant');
  var title = isQ ? 'Clear the quadrants?' : 'Clear the board?';
  var msg = isQ
    ? 'This will remove all token placements from the quadrant chart and reset axis labels.'
    : 'This will remove all custom tokens, written titles, and placements. Everything resets to the default clean state.';
  showConfirm(title, msg, function(){
    vib(10);
    if(isQ){
      // Quadrant-only clear: remove quadrant clones and data in-place
      if(typeof window.clearQuadrants === 'function') window.clearQuadrants();
    } else {
      // Full clear: remove everything — but stash a one-shot backup first so
      // the post-reload toast can offer an Undo lifeline.
      try {
        localStorage.setItem('tm_clear_backup', JSON.stringify({
          board: localStorage.getItem(STORAGE_KEY),
          quadrant: localStorage.getItem('tm_quadrant'),
          mode: localStorage.getItem('tm_mode'),
          at: Date.now()
        }));
      } catch(e){}
      try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
      try { localStorage.removeItem('tm_quadrant'); } catch(e){}
      try { localStorage.removeItem('tm_mode'); } catch(e){}
      // Clearing the board is a hard reset — don't re-prompt the first-run tour.
      try { localStorage.setItem('fstm_onboarded_v1', '1'); } catch(e){}
      location.reload();
    }
  });
});
on($('#undoBtn'),'click', function(){
  animateBtn(this);
  if(typeof window.isBattleMode === 'function' && window.isBattleMode()){
    if(typeof window.battleUndo === 'function') window.battleUndo();
  } else {
    // Only confirm when something actually changed (stale entries are skipped;
    // if none were usable the button simply disables itself)
    if(undoLast()){ vib(6); showSaveToast('Undone'); }
  }
});

/* ===== Save Tierlist (keeps on-screen circle size) ===== */
// Warm the exporter up on intent so the first Save feels instant
(function(){
  var sb = $('#saveBtn'); if (!sb) return;
  var warm = function(){ prepareExport()['catch'](function(){}); };
  on(sb, 'pointerenter', warm); on(sb, 'focus', warm); on(sb, 'touchstart', warm, _supportsPassive ? {passive:true} : false);
})();
on($('#saveBtn'),'click', function(){
  // In quadrant mode, let quadrant.js handle the export
  if(typeof window.currentChartMode === 'function' && window.currentChartMode() === 'quadrant') return;
  // In battles mode, save the bracket as PNG
  if(typeof window.isBattleMode === 'function' && window.isBattleMode()){
    if(typeof window.saveBracket === 'function') window.saveBracket();
    return;
  }
  $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
  $$('.token.show-del').forEach(function(t){ t.classList.remove('show-del'); });
  $$('.dropzone.drag-over').forEach(function(z){ z.classList.remove('drag-over'); });

  runExport(function(){
    var panel = $('#boardPanel');

    var cloneWrap = document.createElement('div');
    cloneWrap.style.position='fixed'; cloneWrap.style.left='-99999px'; cloneWrap.style.top='0';

    var clone = panel.cloneNode(true);
    clone.removeAttribute('id');
    clone.style.width = '1200px';
    clone.style.maxWidth = '1200px';
    // Strip the panel's outer decoration — it's a page card effect, not part of the image.
    // Removing it prevents html-to-image from adding canvas padding for shadow bleed,
    // which would otherwise appear as a faint shadow at the left edge of every row.
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.borderRadius = '0';
    // Always export at desktop sizes, whatever device is saving
    clone.style.setProperty('--tok', '99px');
    clone.style.setProperty('--tier-label-w', '180px');
    clone.style.setProperty('--tier-gap', '12px');
    clone.style.setProperty('--drop-pad', '12px');
    clone.style.setProperty('--drop-gap', '12px');

    // Export styles: hide UI chrome, force desktop layout, use real flex centering
    // html-to-image uses the browser's SVG foreignObject renderer so all CSS works correctly
    var style = document.createElement('style');
    style.textContent = [
      '.row-del, .token-del, .token-crop, .color-pick-btn, .color-pick-input{ display:none !important; }',
      // Always render at desktop column widths regardless of device
      '.tier-row{ grid-template-columns:180px 1fr !important; gap:12px !important; }',
      '.tier-drop{ grid-template-columns:repeat(auto-fill,minmax(105px,1fr)) !important; padding:12px !important; gap:12px !important; min-height:99px !important; }',
      '.tier-label{ min-height:99px !important; }',
      // Token container
      '.token{ width:99px !important; height:99px !important; position:relative !important; }',
      // Token label - proper flex centering (html-to-image renders CSS correctly)
      '.token .label{',
      '  display:flex !important; align-items:center !important; justify-content:center !important;',
      '  position:absolute !important; top:0 !important; left:0 !important;',
      '  width:99px !important; height:99px !important;',
      '  text-align:center !important; font-weight:900 !important; white-space:nowrap !important;',
      '  padding:0 !important; margin:0 !important; box-sizing:border-box !important;',
      '}',
      // Tier label container — no shadow in a flat export image
      '.tier-label{ position:relative !important; width:100% !important; height:100% !important; box-shadow:none !important; }',
      // Token drop zone — strip shadow so it doesn't bleed left onto the tier label
      '.tier-drop{ box-shadow:none !important; }',
      // chip-area fills the label box
      '.chip-area{ display:flex !important; width:100% !important; height:100% !important; }',
      // Tier label chip - flex centering + explicit font (correctly rendered by html-to-image)
      '.label-chip{',
      '  display:flex !important; align-items:center !important; justify-content:center !important;',
      '  width:100% !important; height:100% !important;',
      '  font-family:"Bowlby One",sans-serif !important; font-weight:400 !important;',
      '  text-transform:uppercase !important; letter-spacing:0.5px !important; line-height:1.1 !important;',
      '  text-align:center !important;',
      // color intentionally NOT forced — each chip carries its own inline color
      '  padding:6px 8px !important; margin:0 !important;',
      '  white-space:normal !important; overflow:hidden !important;',
      '}',
      '.board-title-wrap{ display:block !important; text-align:center !important; margin-bottom:20px !important; }',
      '.board-title{ display:block !important; text-align:center !important; font-size:28px !important; white-space:normal !important; word-wrap:break-word !important; overflow-wrap:break-word !important; }',
      '.title-pen, .prompt-stack-wrap, .prompt-browse, .mode-toggle-wrap, #quadrantBoard, #battleBoard, .empty-hint{ display:none !important; }'
    ].join('\n');
    // Inject font @font-face CSS directly into the clone so the SVG renderer can resolve them
    if (_bowlbyFontFaceCSS) style.textContent = _bowlbyFontFaceCSS + '\n' + style.textContent;
    if (_montserratFontFaceCSS) style.textContent = _montserratFontFaceCSS + '\n' + style.textContent;
    clone.appendChild(style);

    // Handle title for export: if empty, strip the title area entirely
    var title = clone.querySelector('.board-title');
    var titleText = title ? title.textContent.replace(/\s+/g,'') : '';
    if (!titleText) {
      var wrap = title ? title.parentElement : null;
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    cloneWrap.appendChild(clone);
    document.body.appendChild(cloneWrap);

    // Re-fit tier label chips so custom text renders correctly in export
    var cloneChips = $$('.label-chip', clone);
    cloneChips.forEach(function(chip){ fitChipLabel(chip); });
    // Uniform size across long (3+ char) tier labels in clone
    var longCloneChips = cloneChips.filter(function(c){ return c.textContent.replace(/\s+/g,' ').trim().length > 2; });
    if (longCloneChips.length >= 2) {
      var minChipSize = Infinity;
      longCloneChips.forEach(function(c){ var sz = parseInt(c.style.fontSize, 10); if (sz && sz < minChipSize) minChipSize = sz; });
      if (minChipSize < Infinity && minChipSize > 0) longCloneChips.forEach(function(c){ c.style.fontSize = minChipSize + 'px'; });
    }

    // Size each label to fit on single line (canvas measurement for accuracy)
    $$('.token .label', clone).forEach(function(lbl){
      var text = lbl.textContent;
      var maxW = 89; // token width with small margin
      var px = 22; // start at 22px for bold readable export
      for (; px >= 10; px--) {
        if (measureTokenText(text, '900', px) <= maxW) break;
      }
      lbl.style.fontFamily = "'Montserrat',ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
      lbl.style.fontWeight = '900';
      lbl.style.fontSize = px + 'px';
    });

    return { node: clone, wrap: cloneWrap, width: 1200, filename: exportFilename('tier-list') };
  });
});

/* ---------- Toast feedback ---------- */
/* action: optional {label, onClick} — renders a tappable button (e.g. an
   "Undo" lifeline) and keeps the toast up long enough to reach for it. */
function showSaveToast(msg, isError, action){
  var existing = $('#saveToast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'saveToast';
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  toast.setAttribute('role','status');
  var txt = document.createElement('span');
  txt.textContent = msg;
  toast.appendChild(txt);
  var life = 1800;
  if (action && action.label && typeof action.onClick === 'function'){
    life = 5200;
    var act = document.createElement('button');
    act.type = 'button';
    act.className = 'toast-action';
    act.textContent = action.label;
    act.addEventListener('click', function(){
      toast.remove();
      action.onClick();
    });
    toast.appendChild(act);
  }
  document.body.appendChild(toast);
  setTimeout(function(){ toast.classList.add('toast-out'); }, life);
  setTimeout(function(){ toast.remove(); }, life + 400);
}
window.showSaveToast = showSaveToast;

/* One-shot "Board cleared — Undo" lifeline shown after the clear-board reload */
(function(){
  var raw = null;
  try { raw = localStorage.getItem('tm_clear_backup'); localStorage.removeItem('tm_clear_backup'); } catch(e){ return; }
  if (!raw) return;
  var bak = null;
  try { bak = JSON.parse(raw); } catch(e){ return; }
  if (!bak || !bak.at || Date.now() - bak.at > 60000) return; // stale — ignore
  // Keep the backup's images out of GC for the rest of this page session —
  // otherwise the first autosave after the reload deletes them and Undo
  // restores blank image tokens. (If Undo isn't used, the next page load
  // cleans them up.)
  _gcProtectedJson.push(String(bak.board || ''), String(bak.quadrant || ''));
  showSaveToast('Board cleared', false, {label:'Undo', onClick:function(){
    if (bak.board != null) lsSet(STORAGE_KEY, bak.board);
    if (bak.quadrant != null) lsSet('tm_quadrant', bak.quadrant);
    if (bak.mode != null) lsSet('tm_mode', bak.mode);
    location.reload();
  }});
})();

/* ---------- Dismiss delete overlay on outside click ---------- */
on(document,'click', function(e){
  if(!e.target.closest('.token')) $$('.token.show-del').forEach(function(t){ t.classList.remove('show-del'); });
});

/* ---------- Keyboard quick-jump (1..N) ---------- */
on(document,'keydown',function(e){
  // Never hijack digits while the user is typing (title, tier names, inputs)
  if (isTypingTarget(e.target)) return;
  var selected=$('.token.selected'); if(!selected) return;
  var n=parseInt(e.key,10); if(isNaN(n)||n<1) return;

  // Quadrant mode: 1-4 map to TL, TR, BL, BR
  if(typeof window.currentChartMode === 'function' && window.currentChartMode() === 'quadrant'){
    if(n>4) return;
    var qz=document.getElementById('qzone-'+['tl','tr','bl','br'][n-1]);
    if(!qz) return;
    e.preventDefault();
    var origin=selected.parentElement;
    var fromTray=(origin.id==='tray');
    var rect=qz.getBoundingClientRect();
    var pinH=20;
    // Place near center with slight random offset
    var cx=(rect.width/2-20)+(Math.random()-0.5)*40;
    var cy=(rect.height/2-pinH/2)+(Math.random()-0.5)*40;
    if(typeof window.clampQPosition==='function'){
      var cl=window.clampQPosition(cx,cy,rect.width,rect.height,pinH,qz);cx=cl.x;cy=cl.y;
    } else { cx=Math.max(0,Math.min(cx,rect.width-60));cy=Math.max(0,Math.min(cy,rect.height-pinH)); }
    var placed;
    if(fromTray && typeof window.cloneTokenForQuadrant==='function'){
      placed=window.cloneTokenForQuadrant(selected);
      if(!placed) return;
      selected.classList.remove('selected');
      qz.appendChild(placed);
      selected.classList.add('q-placed-hidden');
      pushHistory({type:'qplace', pinId: placed.id});
    } else {
      placed=selected;
      qz.appendChild(placed);
    }
    placed.style.position='absolute';
    placed.style.left=(cx/rect.width*100)+'%';
    placed.style.top=(cy/rect.height*100)+'%';
    placed.classList.remove('selected');
    if(typeof window.bringQTokenToFront==='function') window.bringQTokenToFront(placed);
    vib(4);
    live('Placed "'+(placed.dataset.pinName||tokenName(placed))+'" on quadrant');
    if(typeof window.scheduleQuadrantSave==='function') window.scheduleQuadrantSave();
    return;
  }

  // Tier mode
  if(n<=rowCount()){
    e.preventDefault(); var rows=$$('.tier-row'); var row=rows[n-1]; if(!row) return;
    var zone=row.querySelector('.tier-drop'); var fromId2=ensureId(selected.parentElement,'zone');
    var origin2=selected.parentElement; ensureId(zone,'zone');
    var kbNext2=selected.nextElementSibling;
    var kbBeforeId2=kbNext2?ensureId(kbNext2,'tok'):'';
    flipZones([origin2, zone], function(){ zone.appendChild(selected); });
    selected.classList.remove('selected');
    selected.style.position=''; selected.style.left=''; selected.style.top='';
    recordPlacement(selected.id,fromId2,zone.id,kbBeforeId2); vib(4); live('Moved "'+tokenName(selected)+'" to '+rowLabel(row));
  }
});

/* ---------- Global keyboard shortcuts: Cmd/Ctrl+Z, Cmd/Ctrl+S, ? ---------- */
on(document,'keydown', function(e){
  var t = e.target;
  var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  var mod = e.metaKey || e.ctrlKey;
  // Undo
  if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    if (typing) return; // don't override text-editor undo
    e.preventDefault();
    var undoBtn = $('#undoBtn');
    if (undoBtn && !undoBtn.disabled) undoBtn.click();
    return;
  }
  // Save
  if (mod && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    var saveBtn = $('#saveBtn');
    if (saveBtn && !saveBtn.disabled) saveBtn.click();
    return;
  }
  // ? opens help drawer
  if (!mod && !typing && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
    e.preventDefault();
    var handle = $('#helpHandle');
    if (handle) handle.click();
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
    var isPng = file.type === 'image/png';
    callback(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : 0.85));
  };
  img.onerror = function(){ URL.revokeObjectURL(blobUrl); callback(null); };
  img.src = blobUrl;
}

/* ---------- LocalStorage persistence ---------- */
var STORAGE_KEY = 'tm_tierlist';

/* ---------- IndexedDB image store ----------
   Image tokens can carry large base64 data URLs. Storing them inline in the
   single tm_tierlist localStorage key blows past the ~5MB quota and silently
   drops the ENTIRE save (titles + placements included). Instead we keep image
   bytes in IndexedDB keyed by id and store only a lightweight "idb:<id>"
   reference in the tier-list JSON, so the JSON stays tiny and never overflows.
   Falls back to inlining when IndexedDB is unavailable (e.g. some private
   modes), preserving the old behaviour for small boards. */
var IDB_NAME = 'tm_images';
var IDB_STORE = 'images';
var IDB_REF_PREFIX = 'idb:';
var _idbAvailable = !!window.indexedDB;
var _idbPromise = null;
var _imgKeySeq = 0;

function idbOpen(){
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise(function(resolve, reject){
    if (!_idbAvailable){ reject(new Error('no-idb')); return; }
    var req;
    try { req = indexedDB.open(IDB_NAME, 1); } catch(e){ reject(e); return; }
    req.onupgradeneeded = function(){
      var db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = function(){ resolve(req.result); };
    req.onerror = function(){ reject(req.error || new Error('idb-open')); };
  });
  return _idbPromise;
}
function idbPut(key, value){
  return idbOpen().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = function(){ resolve(true); };
      tx.onerror = function(){ reject(tx.error); };
      tx.onabort = function(){ reject(tx.error); };
    });
  });
}
function idbGet(key){
  return idbOpen().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE, 'readonly');
      var rq = tx.objectStore(IDB_STORE).get(key);
      rq.onsuccess = function(){ resolve(rq.result); };
      rq.onerror = function(){ reject(rq.error); };
    });
  });
}
function idbDeleteKeys(keys){
  if (!keys || !keys.length) return Promise.resolve(true);
  return idbOpen().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE, 'readwrite');
      var store = tx.objectStore(IDB_STORE);
      keys.forEach(function(k){ store['delete'](k); });
      tx.oncomplete = function(){ resolve(true); };
      tx.onerror = function(){ reject(tx.error); };
    });
  });
}
function idbAllKeys(){
  return idbOpen().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE, 'readonly');
      var store = tx.objectStore(IDB_STORE);
      if (store.getAllKeys){
        var rq = store.getAllKeys();
        rq.onsuccess = function(){ resolve(rq.result || []); };
        rq.onerror = function(){ reject(rq.error); };
      } else {
        var keys = [];
        var cur = store.openCursor();
        cur.onsuccess = function(){ var c = cur.result; if(c){ keys.push(c.key); c['continue'](); } else resolve(keys); };
        cur.onerror = function(){ reject(cur.error); };
      }
    });
  });
}
function newImgKey(){
  _imgKeySeq++;
  return 'img_' + Date.now().toString(36) + '_' + _imgKeySeq + '_' + Math.random().toString(36).slice(2,8);
}
// Serialize an image token: persist data-URL bytes to IndexedDB and store only
// a tiny reference. Remote URLs (and the no-IDB fallback) are stored inline.
function serializeImageToken(tok, img){
  var src = img.src;
  if (_idbAvailable){
    var key = tok.dataset.imgKey;
    // Mint a key for a fresh data-URL image; existing keyed tokens reuse theirs.
    if (!key && src && src.indexOf('data:') === 0){ key = newImgKey(); tok.dataset.imgKey = key; }
    if (key){
      // Only (re)write bytes when we actually have them — a token whose image
      // is still loading back from IDB keeps src empty, but must NOT lose its
      // reference, so we always re-emit the idb ref and mark it referenced.
      if (src && src.indexOf('data:') === 0) idbPut(key, src)['catch'](function(){});
      _referencedImgKeys[key] = true;
      return { type:'image', src: IDB_REF_PREFIX + key, alt: img.alt, custom: true, crop: tok.dataset.crop || undefined };
    }
  }
  return { type:'image', src: src, alt: img.alt, custom: true, crop: tok.dataset.crop || undefined };
}
// Drop IndexedDB entries no longer referenced by any token (e.g. deleted
// tokens). Throttled so a busy autosave loop doesn't keyscan constantly.
var _lastImgGc = 0;
function collectIdbRefs(json, into){
  if (!json) return;
  var re = /idb:([A-Za-z0-9_]+)/g, m;
  while ((m = re.exec(json))) into[m[1]] = true;
}
function gcImages(){
  if (!_idbAvailable) return;
  var now = Date.now();
  if (now - _lastImgGc < 30000) return;
  _lastImgGc = now;
  var referenced = {};
  for (var k in _referencedImgKeys) referenced[k] = true;
  // Quadrant pins keep their own references (and can outlive their token)
  collectIdbRefs(lsGet('tm_quadrant'), referenced);
  _gcProtectedJson.forEach(function(j){ collectIdbRefs(j, referenced); });
  idbAllKeys().then(function(keys){
    var orphans = keys.filter(function(k){ return !referenced[k]; });
    if (orphans.length) idbDeleteKeys(orphans)['catch'](function(){});
  })['catch'](function(){});
}
var _referencedImgKeys = {};

/* Quadrant pins reuse the same IndexedDB image store: mint/reuse the source
   token's image key so pin data persists as a tiny "idb:<key>" reference
   instead of inlining megabytes of base64 into the tm_quadrant localStorage
   entry (which would silently blow the quota and drop the whole save). */
window.ensureImageKey = function(tok){
  if (!tok || !tok.querySelector) return '';
  var img = tok.querySelector('img');
  if (!img) return '';
  var src = img.src || '';
  if (!_idbAvailable || src.indexOf('data:') !== 0) return tok.dataset.imgKey || '';
  var key = tok.dataset.imgKey;
  if (!key){ key = newImgKey(); tok.dataset.imgKey = key; idbPut(key, src)['catch'](function(){}); }
  return key;
};
window.idbGetImage = function(key, cb){
  idbGet(key).then(function(v){ cb(v || ''); })['catch'](function(){ cb(''); });
};

// Persist to localStorage, surfacing failures (quota exceeded, private mode)
// instead of swallowing them. Toast is throttled so a failing autosave loop
// doesn't spam the user.
var _lastStorageToast = 0;
function safeSetItem(key, value){
  try {
    localStorage.setItem(key, value);
    return true;
  } catch(e){
    var now = Date.now();
    if (now - _lastStorageToast > 10000 && typeof showSaveToast === 'function') {
      _lastStorageToast = now;
      showSaveToast("Couldn't save — storage may be full", true);
    }
    return false;
  }
}
window.safeSetItem = safeSetItem;

function saveTierList(){
  var data = { rows: [], tray: [], title: '' };
  _referencedImgKeys = {}; // rebuilt each save; drives image GC
  // Save title
  var titleEl = $('.board-title');
  if (titleEl) data.title = titleEl.textContent || '';
  // Save rows
  $$('.tier-row').forEach(function(row){
    var chip = row.querySelector('.label-chip');
    var drop = row.querySelector('.tier-drop');
    var rowData = {
      label: chip ? (chip.classList.contains('has-crest') ? (chip.querySelector('.label-crest') ? chip.querySelector('.label-crest').alt : '') : chip.textContent) : '',
      color: chip ? chip.dataset.color : '#ff6b6b',
      image: chip && chip.dataset.crestSrc ? chip.dataset.crestSrc : undefined,
      tokens: []
    };
    $$('.token', drop).forEach(function(tok){
      var lbl = tok.querySelector('.label');
      var img = tok.querySelector('img');
      var isCustom = tok.dataset.custom === 'true';
      if (lbl) {
        rowData.tokens.push({ type: 'name', name: lbl.textContent, color: tok.style.background, textColor: lbl.style.color, custom: isCustom });
      } else if (img) {
        rowData.tokens.push(serializeImageToken(tok, img));
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
      data.tray.push(serializeImageToken(tok, img));
    }
  });
  safeSetItem(STORAGE_KEY, JSON.stringify(data));
  gcImages();
}

// Append a single saved token to a zone, skipping malformed entries.
function restoreToken(zone, tokData){
  if (!tokData || typeof tokData !== 'object') return;
  if (tokData.type === 'name') {
    if (typeof tokData.name !== 'string') return;
    zone.appendChild(buildNameToken(tokData.name, tokData.color || '#7da7ff', !!tokData.custom, tokData.textColor));
  } else if (tokData.type === 'image') {
    if (typeof tokData.src !== 'string' || !tokData.src) return;
    if (tokData.src.indexOf(IDB_REF_PREFIX) === 0) {
      // Image bytes live in IndexedDB — build the token now, fill the src in
      // asynchronously, and keep the key so the next save reuses it.
      var key = tokData.src.slice(IDB_REF_PREFIX.length);
      var el = buildImageToken('', tokData.alt);
      el.dataset.imgKey = key;
      var imgEl = el.querySelector('img');
      idbGet(key).then(function(dataUrl){
        if (dataUrl && imgEl) imgEl.src = dataUrl;
      })['catch'](function(){});
      if (tokData.crop) applyTokenCrop(el, tokData.crop);
      zone.appendChild(el);
    } else {
      var imgTok = buildImageToken(tokData.src, tokData.alt);
      if (tokData.crop) applyTokenCrop(imgTok, tokData.crop);
      zone.appendChild(imgTok);
    }
  }
}
function loadTierList(){
  var json;
  try { json = localStorage.getItem(STORAGE_KEY); } catch(e){ return false; }
  if (!json) return false;
  var data;
  try { data = JSON.parse(json); } catch(e){ data = null; }
  // Validate top-level shape before touching the DOM.
  if (!data || !Array.isArray(data.rows)) {
    if (typeof showSaveToast === 'function') showSaveToast('Saved board was corrupted — starting fresh', true);
    return false;
  }
  try {
    // Restore title
    var titleEl = $('.board-title');
    if (titleEl && typeof data.title === 'string') titleEl.textContent = data.title;
    // Clear default rows and tray
    board.innerHTML = '';
    tray.innerHTML = '';
    // Restore rows (skip malformed rows/tokens rather than aborting)
    data.rows.forEach(function(rowData){
      if (!rowData || typeof rowData !== 'object') return;
      var node = createRow({ label: rowData.label, color: rowData.color, image: rowData.image });
      var drop = node.querySelector('.tier-drop');
      if (Array.isArray(rowData.tokens)) {
        rowData.tokens.forEach(function(tokData){ restoreToken(drop, tokData); });
      }
      board.appendChild(node);
    });
    uniformizeTierLabels();
    // Restore tray
    if (Array.isArray(data.tray)) {
      data.tray.forEach(function(tokData){ restoreToken(tray, tokData); });
    }
    return true;
  } catch(e){
    if (typeof showSaveToast === 'function') showSaveToast('Saved board was corrupted — starting fresh', true);
    return false;
  }
}

// Auto-save on changes (debounced)
var _saveTimeout = null;
function scheduleSave(){
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(saveTierList, 800);
  updateTrayCount();
  // Also trigger quadrant save if in quadrant mode
  if(typeof window.scheduleQuadrantSave === 'function') window.scheduleQuadrantSave();
}

/* ---------- Token counter ---------- */
function updateTrayCount(){
  var badge = $('#trayCount');
  if (!badge || !tray) return;
  // Tokens placed on the quadrant are hidden in the tray — don't count them
  var count = $$('.token', tray).filter(function(t){ return !t.classList.contains('q-placed-hidden'); }).length;
  var prev = parseInt(badge.textContent, 10) || 0;
  badge.textContent = count;
  badge.setAttribute('data-count', count);
  if (count !== prev) {
    badge.classList.remove('pulse');
    void badge.offsetWidth; // reflow to re-trigger
    badge.classList.add('pulse');
    // Glow when going from 0 to non-zero
    if (prev === 0 && count > 0) {
      badge.classList.remove('glow'); void badge.offsetWidth;
      badge.classList.add('glow');
      setTimeout(function(){ badge.classList.remove('glow'); }, 600);
    }
  }
  updateEmptyHint();
}

// Show a gentle hint when the whole board (tray + every tier) is empty.
function updateEmptyHint(){
  var hint = $('#emptyHint');
  if (!hint) return;
  // Hide outside the default tier mode (battles/quadrant manage their own UI).
  var inTierMode = !(typeof window.currentChartMode === 'function' && window.currentChartMode() !== 'tier');
  var hasTokens = $$('.token').length > 0;
  hint.hidden = hasTokens || !inTierMode;
}
window.updateEmptyHint = updateEmptyHint;

// Hook into mutations for auto-save
var _saveObserver = null;
var _autoSaveTitleBound = false;
function startAutoSave(){
  if (_saveObserver) return;
  var onMutate = function(){ scheduleSave(); updateTrayCount(); };
  _saveObserver = new MutationObserver(onMutate);
  // Watch structural changes only. Title edits save via the 'input' listener
  // below; label-text edits route through code paths that call scheduleSave.
  _saveObserver.observe(board, { childList: true, subtree: true });
  _saveObserver.observe(tray, { childList: true, subtree: true });
  var titleEl = $('.board-title');
  if (titleEl && !_autoSaveTitleBound) {
    _autoSaveTitleBound = true;
    on(titleEl, 'input', scheduleSave);
    // The title is contenteditable + aria-multiline="false": keep it a single
    // plain-text line. Block Enter (which inserts <div>/<br>) and strip rich
    // markup on paste so styled HTML/images can't leak into the title/export.
    on(titleEl, 'keydown', function(e){
      if (e.key === 'Enter'){ e.preventDefault(); titleEl.blur(); }
    });
    on(titleEl, 'paste', function(e){ pastePlainText(e); scheduleSave(); });
  }
}
function stopAutoSave(){
  if (_saveObserver){ _saveObserver.disconnect(); _saveObserver = null; }
}
window.startAutoSave = startAutoSave;
window.stopAutoSave = stopAutoSave;

/* ---------- Prompt suggestions with optional tier configs ---------- */
var TIER_PROMPTS = [
  { text: 'Most Likely to Survive the Hunger Games' },
  { text: 'Best to Worst Zombie Apocalypse Survival Team Members' },
  { text: 'Most to Least Cleanly' },
  { text: 'Who Would You Rather Be Stuck in an Elevator With' },
  { text: 'Best to Worst Road Trip Companions' },
  { text: 'Best to Worst At Keeping Secrets' },
  { text: 'Most to Least Likely to Go Viral on TikTok' },
  { text: 'Who Would Win in a Roast Battle' },
  { text: 'Who Would You Trust to Cook for You' },
  { text: 'Trustworthy Enough to Watch Your Apartment While On Vacation' },
  { text: 'Best to Worst Survival Skills if Lost in the Woods' },
  { text: 'Most to Least Dramatic Character Energy' },
  { text: 'Best Dressed on a Night Out' },
  { text: 'Who Would Be the Best to Worst Spy' },
  { text: 'Most to Least Likely to Start a Cult' },
  { text: 'Could They Talk Their Way Out of a Ticket' },
  { text: 'Who Would You Want on Your Trivia Team' },
  { text: 'Would They Share Their Fries' },
  { text: 'Most to Least Likely to Cry During a Pixar Movie' },
  { text: 'Most to Least Likely to Be in Fireside in a Year' },
  { text: 'Best to Worst Voice in VC' },
  { text: 'People You\'re Most to Least Excited to See Chatting in Gen Chat' },
  { text: 'Most to Least Likely to End Up in Prison' },
  { text: 'Best to Worst Parent in Theory' },
  { text: 'Most to Least Likely to Take a Joke Too Far' },
  { text: 'Most to Least Funny in Fireside' },
  { text: 'Most to Least Has Their Shit Together in Fireside' },
  { text: 'Most to Least Wealthy in Fireside Based on What You Know' },
  { text: 'What color aura do these people give off?', tiers: [
    { label: 'RED', color: '#ef4444' },
    { label: 'ORANGE', color: '#f97316' },
    { label: 'YELLOW', color: '#eab308' },
    { label: 'GREEN', color: '#22c55e' },
    { label: 'BLUE', color: '#3b82f6' },
    { label: 'PURPLE', color: '#a855f7' },
    { label: 'PINK', color: '#ec4899' }
  ]},
  { text: 'How well do you actually know these people?', tiers: [
    { label: 'BESTIE', color: '#ec4899' },
    { label: 'CLOSE', color: '#a855f7' },
    { label: 'COOL', color: '#3b82f6' },
    { label: 'CHILL', color: '#22c55e' },
    { label: 'MET ONCE', color: '#eab308' },
    { label: 'WHO?', color: '#6b7280' }
  ]},
  { text: 'Which element are these people?', tiers: [
    { label: 'FIRE', color: '#ef4444' },
    { label: 'WATER', color: '#3b82f6' },
    { label: 'EARTH', color: '#84cc16' },
    { label: 'AIR', color: '#a5b4fc' }
  ]},
  { text: 'What Hogwarts house would they be in?', tiers: [
    { label: 'GRYFFINDOR', color: '#dc2626' },
    { label: 'SLYTHERIN', color: '#16a34a' },
    { label: 'RAVENCLAW', color: '#2563eb' },
    { label: 'HUFFLEPUFF', color: '#eab308' }
  ]},
  { text: 'How trustworthy are they on a scale?', tiers: [
    { label: 'VAULT', color: '#22c55e' },
    { label: 'SOLID', color: '#3b82f6' },
    { label: 'OKAY', color: '#eab308' },
    { label: 'RISKY', color: '#f97316' },
    { label: 'SNITCH', color: '#ef4444' }
  ]},
  { text: 'What role would they play in a heist?', tiers: [
    { label: 'MASTERMIND', color: '#6366f1' },
    { label: 'HACKER', color: '#06b6d4' },
    { label: 'MUSCLE', color: '#ef4444' },
    { label: 'DRIVER', color: '#f59e0b' },
    { label: 'INSIDE MAN', color: '#22c55e' },
    { label: 'LOOSE CANNON', color: '#ec4899' }
  ]},
  { text: 'What season energy do they give?', tiers: [
    { label: 'SUMMER', color: '#f59e0b' },
    { label: 'AUTUMN', color: '#ea580c' },
    { label: 'WINTER', color: '#6366f1' },
    { label: 'SPRING', color: '#22c55e' }
  ]},
  { text: "What's their love language?", tiers: [
    { label: 'WORDS', color: '#ec4899' },
    { label: 'ACTS', color: '#22c55e' },
    { label: 'GIFTS', color: '#eab308' },
    { label: 'QUALITY TIME', color: '#3b82f6' },
    { label: 'TOUCH', color: '#ef4444' }
  ]},
  { text: 'What type of texter are they?', tiers: [
    { label: 'INSTANT', color: '#22c55e' },
    { label: 'DOUBLE TEXT', color: '#3b82f6' },
    { label: 'SEEN ZONE', color: '#eab308' },
    { label: 'SLOW BURN', color: '#f97316' },
    { label: 'LEFT ON READ', color: '#ef4444' }
  ]},
  { text: "What's their squad role?", tiers: [
    { label: 'THE PLANNER', color: '#3b82f6' },
    { label: 'HYPE MAN', color: '#eab308' },
    { label: 'MOM FRIEND', color: '#ec4899' },
    { label: 'WILD CARD', color: '#f97316' },
    { label: 'THE VIBE', color: '#22c55e' },
    { label: 'THE MENACE', color: '#ef4444' }
  ]},
  { text: 'What music genre are they?', tiers: [
    { label: 'POP', color: '#ec4899' },
    { label: 'HIP HOP', color: '#a855f7' },
    { label: 'INDIE', color: '#22c55e' },
    { label: 'ELECTRONIC', color: '#06b6d4' },
    { label: 'COUNTRY', color: '#f59e0b' },
    { label: 'ROCK', color: '#ef4444' }
  ]},
  { text: "What's their D&D alignment?", tiers: [
    { label: 'LAWFUL GOOD', color: '#22c55e' },
    { label: 'NEUTRAL GOOD', color: '#84cc16' },
    { label: 'CHAOTIC GOOD', color: '#3b82f6' },
    { label: 'LAWFUL NEUTRAL', color: '#6366f1' },
    { label: 'TRUE NEUTRAL', color: '#6b7280' },
    { label: 'CHAOTIC NEUTRAL', color: '#f59e0b' },
    { label: 'LAWFUL EVIL', color: '#a855f7' },
    { label: 'NEUTRAL EVIL', color: '#f97316' },
    { label: 'CHAOTIC EVIL', color: '#ef4444' }
  ]},
  { text: "What's their Pokémon type?", tiers: [
    { label: 'FIRE', color: '#ef4444' },
    { label: 'WATER', color: '#3b82f6' },
    { label: 'GRASS', color: '#22c55e' },
    { label: 'ELECTRIC', color: '#eab308' },
    { label: 'PSYCHIC', color: '#ec4899' },
    { label: 'DARK', color: '#4b5563' }
  ]},
  { text: "What's their vibe at a party?", tiers: [
    { label: 'HOST MODE', color: '#f59e0b' },
    { label: 'LIFE OF THE PARTY', color: '#ef4444' },
    { label: 'DEEP CONVO CORNER', color: '#6366f1' },
    { label: 'PHONE IN HAND', color: '#6b7280' },
    { label: 'EARLY LEAVER', color: '#3b82f6' }
  ]},
  { text: "What's their chaos level?", tiers: [
    { label: 'FULLY LAWFUL', color: '#22c55e' },
    { label: 'MOSTLY CHILL', color: '#3b82f6' },
    { label: 'UNPREDICTABLE', color: '#eab308' },
    { label: 'GREMLIN', color: '#f97316' },
    { label: 'AGENT OF CHAOS', color: '#ef4444' }
  ]},
  { text: "What coffee order are they?", tiers: [
    { label: 'ESPRESSO', color: '#78350f' },
    { label: 'BLACK COFFEE', color: '#292524' },
    { label: 'OAT LATTE', color: '#d4a96a' },
    { label: 'FRAPPUCCINO', color: '#ec4899' },
    { label: 'MATCHA', color: '#84cc16' },
    { label: 'DECAF', color: '#9ca3af' }
  ]},
  { text: "What's their villain arc?", tiers: [
    { label: 'MASTERMIND', color: '#6366f1' },
    { label: 'RELUCTANT VILLAIN', color: '#a855f7' },
    { label: 'REDEEMABLE ARC', color: '#3b82f6' },
    { label: 'JUST MISUNDERSTOOD', color: '#22c55e' },
    { label: 'ABSOLUTE MENACE', color: '#ef4444' }
  ]},
  { text: "What archetype are they in the group?", tiers: [
    { label: 'THE VISIONARY', color: '#6366f1' },
    { label: 'THE CONNECTOR', color: '#ec4899' },
    { label: 'THE ANCHOR', color: '#3b82f6' },
    { label: 'THE WILDCARD', color: '#f97316' },
    { label: 'THE REALIST', color: '#22c55e' },
    { label: 'THE GHOST', color: '#6b7280' }
  ]},
  { text: "Which era would they best fit in?", tiers: [
    { label: '50s', color: '#92400e' },
    { label: '60s', color: '#dc2626' },
    { label: '70s', color: '#f59e0b' },
    { label: '80s', color: '#ec4899' },
    { label: '90s', color: '#6366f1' },
    { label: '2000s', color: '#06b6d4' },
    { label: '2010s', color: '#22c55e' },
    { label: 'TIMELESS', color: '#4b5563' }
  ]},
  { text: "Most Valuable to Fireside — if they left, how big would the impact be?", tiers: [
    { label: 'IRREPLACEABLE', color: '#22c55e' },
    { label: 'HUGE LOSS', color: '#3b82f6' },
    { label: 'NOTICEABLE', color: '#eab308' },
    { label: "THEY'D MANAGE", color: '#f97316' },
    { label: 'BARELY A BLIP', color: '#ef4444' }
  ]},
  { text: "What role would these people best fit in?", tiers: [
    { label: 'KNIGHT', color: '#6366f1' },
    { label: 'PIRATE', color: '#dc2626' },
    { label: 'NINJA', color: '#1f2937' },
    { label: 'COWBOY', color: '#92400e' },
    { label: 'SAMURAI', color: '#be123c' }
  ]},
  { text: "What's their role on the pirate ship? (One Piece)", tiers: [
    { label: 'CAPTAIN', color: '#e74c3c' },
    { label: 'NAVIGATOR', color: '#e67e22' },
    { label: 'COMBATANT', color: '#27ae60' },
    { label: 'COOK', color: '#3498db' },
    { label: 'SNIPER / GUNNER', color: '#f1c40f' },
    { label: 'DOCTOR', color: '#e91e63' },
    { label: 'ARCHEOLOGIST', color: '#9b59b6' },
    { label: 'SHIPWRIGHT', color: '#00bcd4' },
    { label: 'MUSICIAN', color: '#1a1a1a' },
    { label: 'HELMSMAN', color: '#cd853f' }
  ]},
  { text: "Most to Least Likely to Stab You in the Back", tiers: [
    { label: 'NEVER', color: '#22c55e' },
    { label: 'PROBABLY NOT', color: '#84cc16' },
    { label: 'DEPENDS', color: '#eab308' },
    { label: 'IF IT BENEFITS THEM', color: '#f97316' },
    { label: 'ALREADY HAS', color: '#ef4444' }
  ]},
  { text: "How would they handle being publicly called out?", tiers: [
    { label: 'OWN IT', color: '#22c55e' },
    { label: 'DEFLECT', color: '#3b82f6' },
    { label: 'SPIRAL', color: '#a855f7' },
    { label: 'GASLIGHT', color: '#f97316' },
    { label: 'DENY EVERYTHING', color: '#ef4444' }
  ]},
  { text: "Who would you ACTUALLY want as a roommate?", tiers: [
    { label: 'DREAM ROOMIE', color: '#22c55e' },
    { label: 'SOLID PICK', color: '#3b82f6' },
    { label: 'TOLERABLE', color: '#eab308' },
    { label: 'TOUGH SELL', color: '#f97316' },
    { label: 'NIGHTMARE', color: '#ef4444' }
  ]},
  { text: "Rate their main character energy", tiers: [
    { label: 'MAIN CHARACTER', color: '#f59e0b' },
    { label: 'DEUTERAGONIST', color: '#6366f1' },
    { label: 'SUPPORTING CAST', color: '#3b82f6' },
    { label: 'BACKGROUND NPC', color: '#6b7280' },
    { label: 'THE VILLAIN', color: '#ef4444' }
  ]},
  { text: "Most to Least Likely to Gatekeep Something", tiers: [
    { label: 'SHARES EVERYTHING', color: '#22c55e' },
    { label: 'USUALLY OPEN', color: '#3b82f6' },
    { label: 'SELECTIVE', color: '#eab308' },
    { label: 'HOARDER VIBES', color: '#f97316' },
    { label: 'GATEKEEP QUEEN', color: '#ef4444' }
  ]},
  { text: "Who's most overrated vs underrated in Fireside?", tiers: [
    { label: 'CRIMINALLY UNDERRATED', color: '#22c55e' },
    { label: 'UNDERRATED', color: '#3b82f6' },
    { label: 'RATED ACCURATELY', color: '#6b7280' },
    { label: 'SLIGHTLY OVERRATED', color: '#f97316' },
    { label: 'EXTREMELY OVERRATED', color: '#ef4444' }
  ]},
  { text: 'Which The Office Character Would They Be?', tiers: [
    { label: 'MICHAEL', color: '#2563eb' },
    { label: 'DWIGHT', color: '#92400e' },
    { label: 'JIM', color: '#16a34a' },
    { label: 'PAM', color: '#ec4899' },
    { label: 'ANDY', color: '#f97316' },
    { label: 'RYAN', color: '#06b6d4' },
    { label: 'KELLY', color: '#db2777' },
    { label: 'ANGELA', color: '#a855f7' },
    { label: 'OSCAR', color: '#0891b2' },
    { label: 'KEVIN', color: '#f59e0b' },
    { label: 'STANLEY', color: '#6b7280' },
    { label: 'PHYLLIS', color: '#f43f5e' },
    { label: 'DARRYL', color: '#15803d' },
    { label: 'MEREDITH', color: '#9333ea' },
    { label: 'CREED', color: '#dc2626' }
  ]},
  { text: 'Most to Least Likely to Accidentally Start a Fire' },
  { text: 'Who Would Last the Longest on a Reality TV Show' },
  { text: 'Most to Least Likely to Have a Secret Talent Nobody Knows About' },
  { text: 'Who Would Win in a Dance Battle' },
  { text: 'Most to Least Likely to Respond to a Text at 3 AM' },
  { text: 'Who Would Survive the Longest in a Horror Movie' },
  { text: 'Most to Least Likely to Become Famous One Day' },
  { text: 'Who Would You Want on Your Team for an Escape Room' },
  { text: 'Who Gives the Best Advice vs the Worst Advice' },
  { text: "What type of drunk are they?", tiers: [
    { label: 'HAPPY DRUNK', color: '#f59e0b' },
    { label: 'SLEEPY DRUNK', color: '#6366f1' },
    { label: 'EMOTIONAL DRUNK', color: '#ec4899' },
    { label: 'ANGRY DRUNK', color: '#dc2626' },
    { label: 'PARTY ANIMAL', color: '#ef4444' },
    { label: 'PHILOSOPHICAL', color: '#3b82f6' },
    { label: 'DOESN\'T DRINK', color: '#6b7280' }
  ]},
  { text: "What fast food chain are they?", tiers: [
    { label: 'CHICK-FIL-A', color: '#dc2626' },
    { label: 'MCDONALD\'S', color: '#f59e0b' },
    { label: 'TACO BELL', color: '#7c3aed' },
    { label: 'WENDY\'S', color: '#ef4444' },
    { label: 'IN-N-OUT', color: '#dc2626' },
    { label: 'CHIPOTLE', color: '#92400e' },
    { label: 'SUBWAY', color: '#00a650' },
    { label: 'ARBY\'S', color: '#c8102e' }
  ]},
  { text: "What social media platform are they?", tiers: [
    { label: 'TIKTOK', color: '#000000' },
    { label: 'INSTAGRAM', color: '#e1306c' },
    { label: 'TWITTER/X', color: '#1d9bf0' },
    { label: 'REDDIT', color: '#ff4500' },
    { label: 'YOUTUBE', color: '#ff0000' },
    { label: 'LINKEDIN', color: '#0a66c2' }
  ]},
  { text: "Which Black Clover Magic Knight Squad would they be in?", tiers: [
    { label: 'GOLDEN DAWN', color: '#DAA520', image: 'icons/squads/golden-dawn.png' },
    { label: 'BLACK BULLS', color: '#1a1a1a', image: 'icons/squads/black-bull.png' },
    { label: 'SILVER EAGLES', color: '#A9A9A9', image: 'icons/squads/silver-eagle.png' },
    { label: 'BLUE ROSE', color: '#4169E1', image: 'icons/squads/blue-rose.png' },
    { label: 'CRIMSON LION', color: '#DC143C', image: 'icons/squads/crimson-lion.png' },
    { label: 'GREEN MANTIS', color: '#228B22', image: 'icons/squads/green-mantis.png' },
    { label: 'PURPLE ORCAS', color: '#6A0DAD', image: 'icons/squads/purple-orca.png' },
    { label: 'CORAL PEACOCK', color: '#FF7F50', image: 'icons/squads/coral-peacock.png' },
    { label: 'AQUA DEER', color: '#00CED1', image: 'icons/squads/aqua-deer.png' }
  ]}
];
// Fully shuffle prompts so older topics get equal rotation
shuffleArray(TIER_PROMPTS);
var _deckIndex = 0;
var _promptUserSet = false;
var _maxVisibleCards = 3;
var _hintTimer = null;

/* Prompt card color pairs — each pair rotates text/bg between its two colors */
var PROMPT_CARD_PAIRS = [
  ['#317873', '#E4C9B0'], // Petrol Blue / Warm Sand
  ['#DACD48', '#527882'], // Citron / Blue Slate
  ['#FF7F50', '#008080'], // Coral / Emerald Sea
  ['#004643', '#FAFAFA'], // Cyprus / Cloud White
  ['#1E2B2F', '#FF7F50'], // Cinder / Flame
  ['#9A0002', '#EFE6DE'], // Cherry Cola / Creamy Vanilla
  ['#523D2D', '#F4EFE6'], // Teddy Bear / Vanilla Bean
  ['#A8C686', '#F5F3EC']  // Matcha / Oat Milk
];
function getCardColors(index){
  var pairIdx = index % PROMPT_CARD_PAIRS.length;
  var variant = Math.floor(index / PROMPT_CARD_PAIRS.length) % 2;
  var pair = PROMPT_CARD_PAIRS[pairIdx];
  return { bg: variant === 0 ? pair[0] : pair[1], fg: variant === 0 ? pair[1] : pair[0] };
}
/* Compute an inset border color: lighten 20% for dark bgs, darken 15% for light */
function adjustHex(hex, amount){
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  if(amount>0){ r=Math.round(r+(255-r)*amount); g=Math.round(g+(255-g)*amount); b=Math.round(b+(255-b)*amount); }
  else { r=Math.round(r*(1+amount)); g=Math.round(g*(1+amount)); b=Math.round(b*(1+amount)); }
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}
function cardBorderColor(bgHex){
  var r=parseInt(bgHex.slice(1,3),16)/255, g=parseInt(bgHex.slice(3,5),16)/255, b=parseInt(bgHex.slice(5,7),16)/255;
  var lum=0.299*r+0.587*g+0.114*b;
  return lum>0.5 ? adjustHex(bgHex,-0.15) : adjustHex(bgHex,0.20);
}

/* ---------- Prompt card stack ---------- */
function buildPromptCard(promptIndex){
  var prompt = TIER_PROMPTS[promptIndex % TIER_PROMPTS.length];
  var colors = getCardColors(promptIndex);
  var card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.promptIndex = promptIndex % TIER_PROMPTS.length;
  card.style.background = colors.bg;
  card.style.color = colors.fg;

  /* #10 Accessibility — ARIA attributes */
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-roledescription', 'swipeable card');
  card.setAttribute('aria-label', prompt.text + (prompt.tiers ? ' (includes custom tiers)' : ''));

  // Skip button (left) — explicit alternative to swipe-left / ArrowLeft
  var skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'prompt-card-btn prompt-card-skip';
  skipBtn.setAttribute('aria-label', 'Skip this prompt');
  skipBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  // Prevent the press from starting a card drag, then skip on click.
  on(skipBtn, 'pointerdown', function(e){ e.stopPropagation(); });
  on(skipBtn, 'click', function(e){ e.stopPropagation(); e.preventDefault(); skipCard(card); });
  card.appendChild(skipBtn);

  var text = document.createElement('span');
  text.className = 'prompt-card-text';
  text.textContent = prompt.text;
  text.style.color = colors.fg;
  card.appendChild(text);

  if(prompt.tiers){
    var badge = document.createElement('span');
    badge.className = 'prompt-card-badge';
    badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="18" height="18"><path d="M10.5026 5.01692L9.96661 3.65785C9.62068 2.78072 8.37933 2.78072 8.03339 3.65784L6.96137 6.37599C6.85576 6.64378 6.64378 6.85575 6.37599 6.96137L3.65785 8.03339C2.78072 8.37932 2.78072 9.62067 3.65784 9.96661L6.37599 11.0386C6.64378 11.1442 6.85575 11.3562 6.96137 11.624L8.03339 14.3422C8.37932 15.2193 9.62067 15.2193 9.96661 14.3422L11.0386 11.624C11.1442 11.3562 11.3562 11.1442 11.624 11.0386L14.3422 9.96661C15.2193 9.62068 15.2193 8.37933 14.3422 8.03339L12.9831 7.49738"/><path d="M16.4885 13.3481C16.6715 12.884 17.3285 12.884 17.5115 13.3481L18.3121 15.3781C18.368 15.5198 18.4802 15.632 18.6219 15.6879L20.6519 16.4885C21.116 16.6715 21.116 17.3285 20.6519 17.5115L18.6219 18.3121C18.4802 18.368 18.368 18.4802 18.3121 18.6219L17.5115 20.6519C17.3285 21.116 16.6715 21.116 16.4885 20.6519L15.6879 18.6219C15.632 18.4802 15.5198 18.368 15.3781 18.3121L13.3481 17.5115C12.884 17.3285 12.884 16.6715 13.3481 16.4885L15.3781 15.6879C15.5198 15.632 15.632 15.5198 15.6879 15.3781L16.4885 13.3481Z"/></svg>';
    badge.style.color = colors.fg;
    badge.style.opacity = '1';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    card.appendChild(badge);
  }

  // Use button (right) — explicit alternative to tap/swipe-right/Enter
  var useBtn = document.createElement('button');
  useBtn.type = 'button';
  useBtn.className = 'prompt-card-btn prompt-card-use';
  useBtn.setAttribute('aria-label', 'Use this prompt');
  useBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>';
  on(useBtn, 'pointerdown', function(e){ e.stopPropagation(); });
  on(useBtn, 'click', function(e){ e.stopPropagation(); e.preventDefault(); useCard(card); });
  card.appendChild(useBtn);

  return card;
}

function setCardStackPos(card, pos, animate){
  if(animate){
    card.style.transition = 'transform .35s cubic-bezier(.2,0,0,1), box-shadow .35s cubic-bezier(.2,0,0,1), z-index 0s';
  } else {
    card.style.transition = 'none';
  }
  /* #1 data-stack-pos drives CSS elevation per stack depth */
  card.dataset.stackPos = pos;
  card.style.zIndex = 10 - pos;
  // Only the interactive top card is tabbable — back cards are visual filler
  card.setAttribute('tabindex', pos === 0 ? '0' : '-1');
  card.style.opacity = '1';
  if(pos===0){ card.style.transform='scale(1) translateY(0)'; }
  else if(pos===1){ card.style.transform='scale(.98) translateY(8px)'; }
  else { card.style.transform='scale(.96) translateY(16px)'; }
}

/* Initial full render — only used on first load or when stack reappears */
function renderCardStack(){
  var container = $('#promptCards');
  if(!container) return;
  container.innerHTML = '';
  var count = Math.min(_maxVisibleCards, TIER_PROMPTS.length);
  for(var i=count-1; i>=0; i--){
    var idx = (_deckIndex + i) % TIER_PROMPTS.length;
    var card = buildPromptCard(idx);
    setCardStackPos(card, i, false);
    container.appendChild(card);
  }
  var top = container.lastElementChild;
  if(top) enableCardSwipe(top);
  scheduleHint();
}

/* Advance the stack smoothly — promote existing cards, add new one at back */
function advanceCardStack(){
  var container = $('#promptCards');
  if(!container) return;
  _deckIndex = (_deckIndex + 1) % TIER_PROMPTS.length;

  // The top card (lastChild) is already flying off — remove it after transition
  var flyingCard = container.lastElementChild;
  if(flyingCard){
    setTimeout(function(){ if(flyingCard.parentNode) flyingCard.parentNode.removeChild(flyingCard); }, 400);
  }

  // Gather remaining cards (excluding the flying one)
  var remaining = [];
  var child = container.firstElementChild;
  while(child){
    if(child !== flyingCard) remaining.push(child);
    child = child.nextElementSibling;
  }

  // Promote each remaining card up one position with animation
  // remaining[0] was pos 2 (back), remaining[1] was pos 1 (middle)
  // Now: remaining[0] → pos 1, remaining[1] → pos 0
  for(var i=0; i<remaining.length; i++){
    var newPos = remaining.length - 1 - i;
    setCardStackPos(remaining[i], newPos, true);
  }

  // Add a new card at the back (pos = _maxVisibleCards - 1)
  var backPos = _maxVisibleCards - 1;
  var newIdx = (_deckIndex + backPos) % TIER_PROMPTS.length;
  var newCard = buildPromptCard(newIdx);
  setCardStackPos(newCard, backPos, false);
  // Insert at the beginning so it's behind everything
  container.insertBefore(newCard, container.firstElementChild);

  // Enable swipe on the new top card after promotion transition
  var newTop = remaining.length > 0 ? remaining[remaining.length - 1] : newCard;
  // Small delay so the promotion transition is already underway
  setTimeout(function(){ enableCardSwipe(newTop); }, 50);
  scheduleHint();
}

/* Fly a card off-screen in a direction (-1 left / +1 right) */
function flyOffCard(card, dir){
  var cardW = card.offsetWidth || 300;
  card.style.transition = 'transform .5s cubic-bezier(.2,0,0,1), opacity .3s ease';
  card.style.transform = 'translateX(' + (dir * (cardW + 100)) + 'px) rotate(' + (dir * 16) + 'deg)';
  card.style.opacity = '0';
  vib(6);
}
/* Applying a prompt that carries its own tier set rebuilds the board — when
   tokens are already placed, confirm before wiping their placements. */
function confirmPromptUse(prompt, proceed){
  var hasPlacements = !!document.querySelector('.tier-drop .token');
  if (prompt && prompt.tiers && hasPlacements){
    showConfirm(
      'Use this prompt?',
      'This prompt has its own tiers. Your current tiers will be replaced and placed tokens moved back to Image Storage. (You can Undo this.)',
      proceed,
      'Use Prompt'
    );
  } else {
    proceed();
  }
}
/* Shared "use this card" path for tap / swipe-right / keyboard / check button.
   springBackForConfirm returns a mid-gesture card to rest while the dialog is up. */
function usePromptCard(card, springBackForConfirm){
  if(!card) return;
  var idx = parseInt(card.dataset.promptIndex, 10);
  var prompt = TIER_PROMPTS[idx];
  var needsConfirm = prompt && prompt.tiers && !!document.querySelector('.tier-drop .token');
  if(needsConfirm && springBackForConfirm){
    card.style.transition = 'transform .3s cubic-bezier(.2,0,0,1), opacity .25s ease';
    card.style.transform = 'scale(1) translateY(0)';
    card.style.opacity = '1';
  }
  confirmPromptUse(prompt, function(){
    flyOffCard(card, 1);
    setTimeout(function(){ applyPrompt(prompt); }, 250);
  });
}
/* Use this card's prompt (check button / tap / swipe-right) */
function useCard(card){
  if(!card || card.dataset.stackPos !== '0') return;
  usePromptCard(card, true);
}
/* Skip this card and advance to the next (x button / swipe-left) */
function skipCard(card){
  if(!card || card.dataset.stackPos !== '0') return;
  flyOffCard(card, -1);
  advanceCardStack();
}

function enableCardSwipe(card){
  /* #5 Spawn a Material ripple at pointer coordinates */
  function spawnRipple(card, ex, ey){
    var rect = card.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2;
    var ripple = document.createElement('span');
    ripple.className = 'prompt-card-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (ex - rect.left - size / 2) + 'px';
    ripple.style.top  = (ey - rect.top  - size / 2) + 'px';
    card.appendChild(ripple);
    ripple.addEventListener('animationend', function(){ ripple.remove(); });
  }

  on(card, 'pointerdown', function(e){
    if(e.button && e.button!==0) return;
    // Don't start drag/long-press on the inner skip/use buttons — let their click fire.
    if(e.target && e.target.closest && e.target.closest('.prompt-card-btn')) return;
    // Mouse only: stop text selection. Touch must NOT be prevented — the card
    // is touch-action:pan-y, so a vertical swipe scrolls the page natively
    // (the browser then sends pointercancel and nothing is applied).
    if(e.pointerType === 'mouse') e.preventDefault();
    try{ card.setPointerCapture(e.pointerId); }catch(_){}
    clearTimeout(_hintTimer);
    card.classList.remove('hint');

    var startX = e.clientX, startY = e.clientY, dx = 0, dy = 0;
    var dragging = false, moved = false, longPressed = false;
    var cardW = card.offsetWidth || 300;
    var threshold = cardW * 0.25;
    var SLOP = 8; // px of travel before a press stops counting as a tap
    card.style.transition = 'none';

    function detach(){
      clearTimeout(_longPressTimer);
      try{ card.releasePointerCapture(e.pointerId); }catch(_){}
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      card.classList.remove('md-dragging');
    }
    function springBack(){
      card.style.transition = 'transform .3s cubic-bezier(.2,0,0,1), opacity .25s ease';
      card.style.transform = 'scale(1) translateY(0)';
      card.style.opacity = '1';
    }

    /* Long-press detection — opens scrollable prompt list */
    clearTimeout(_longPressTimer);
    _longPressTimer = setTimeout(function(){
      if(moved) return;
      longPressed = true;
      vib(12);
      detach();
      springBack();
      openPromptList();
    }, LONG_PRESS_MS);

    function onMove(ev){
      if(ev.pointerId !== e.pointerId) return;
      dx = ev.clientX - startX; dy = ev.clientY - startY;
      if(!moved && Math.hypot(dx, dy) > SLOP){ moved = true; clearTimeout(_longPressTimer); }
      // Only a mostly-horizontal drag moves the card; vertical travel is a scroll.
      if(!dragging && Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy) * 1.2){
        dragging = true;
        card.classList.add('md-dragging');
      }
      if(!dragging) return;
      var rotate = dx * 0.06;
      var opacity = Math.max(0.5, 1 - Math.abs(dx) / cardW);
      card.style.transform = 'translateX('+dx+'px) rotate('+rotate+'deg)';
      card.style.opacity = opacity;
    }
    function onCancel(ev){
      if(ev && ev.pointerId !== e.pointerId) return;
      if(longPressed) return;
      // Browser took the gesture (page scroll) — never apply anything
      detach();
      springBack();
      scheduleHint();
    }
    function onUp(ev){
      if(ev.pointerId !== e.pointerId) return;
      if(longPressed) return;
      detach();

      if(!moved){
        // A genuine tap (finger barely moved) = use prompt
        spawnRipple(card, ev.clientX, ev.clientY);
        usePromptCard(card, true);
        return;
      }
      if(dragging && Math.abs(dx) >= threshold){
        vib(6);
        if(dx > 0){
          // Right swipe = apply prompt (confirms first when destructive)
          usePromptCard(card, true);
        } else {
          // Left swipe = skip — promote existing cards smoothly
          flyOffCard(card, -1);
          advanceCardStack();
        }
      } else {
        springBack();
        scheduleHint();
      }
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
  });

  // Skip / use buttons are wired in buildPromptCard so every card (including
  // newly promoted ones) responds without depending on this call's timing.

  /* #10 Keyboard support — Enter/Space to apply, ArrowLeft to skip */
  on(card, 'keydown', function(e){
    if(e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight'){
      e.preventDefault();
      vib(6);
      usePromptCard(card);
    } else if(e.key === 'ArrowLeft'){
      e.preventDefault();
      flyOffCard(card, -1);
      advanceCardStack();
    }
  });
}

function scheduleHint(){
  clearTimeout(_hintTimer);
  _hintTimer = setTimeout(function(){
    if(_promptUserSet) return;
    var top = $('#promptCards .prompt-card:last-child');
    if(top){ top.classList.remove('hint'); void top.offsetWidth; top.classList.add('hint'); }
  }, 3500);
}

function showPromptStack(){
  var wrap = $('#promptStack');
  if(wrap) wrap.classList.remove('hidden');
  renderCardStack();
}

function hidePromptStack(){
  var wrap = $('#promptStack');
  if(wrap) wrap.classList.add('hidden');
  clearTimeout(_hintTimer);
}

/* ---------- Scrollable prompt list (long-press overlay) ---------- */
var _longPressTimer = null;
var LONG_PRESS_MS = 500;

/* Sort prompts by thematic similarity for the full list view.
   Uses keyword matching to assign a category, then groups by category.
   Does NOT mutate TIER_PROMPTS — returns a new sorted array of indices. */
function getSimilaritySortedIndices(){
  var categories = [
    { key: 'personality',  words: ['character','energy','vibe','aura','chaos','archetype','main character','dramatic','element','season','alignment','d&d','era','overrated','underrated'] },
    { key: 'social',       words: ['trust','secret','roommate','friend','bestie','squad','role','group','gatekeep','love language','texter','text','gen chat','fireside','valuable','impact','left','year'] },
    { key: 'popculture',   words: ['hogwarts','pok','office','one piece','pirate ship','black clover','horror','villain','drunk','coffee','fast food','music genre','social media'] },
    { key: 'survival',     words: ['survive','survival','hunger games','zombie','apocalypse','woods','lost','spy','heist','escape','fire','prison','stab','back'] },
    { key: 'talent',       words: ['win','battle','dance','roast','trivia','talent','cook','advice','famous','viral','tiktok','voice','dressed','fries','cry','pixar','reality','ticket','party'] }
  ];
  var indexed = [];
  for(var i=0; i<TIER_PROMPTS.length; i++){
    var t = TIER_PROMPTS[i].text.toLowerCase();
    var cat = 'zzz_other'; // sort last
    for(var c=0; c<categories.length; c++){
      for(var w=0; w<categories[c].words.length; w++){
        if(t.indexOf(categories[c].words[w]) !== -1){ cat=categories[c].key; break; }
      }
      if(cat !== 'zzz_other') break;
    }
    indexed.push({ idx: i, cat: cat, text: t });
  }
  indexed.sort(function(a,b){
    if(a.cat < b.cat) return -1;
    if(a.cat > b.cat) return 1;
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  });
  return indexed.map(function(x){ return x.idx; });
}

function openPromptList(){
  if($('#promptListOverlay')) return; // already open

  var overlay = document.createElement('div');
  overlay.id = 'promptListOverlay';
  overlay.className = 'prompt-list-overlay';

  var sheet = document.createElement('div');
  sheet.className = 'prompt-list-sheet';

  // Header
  var header = document.createElement('div');
  header.className = 'prompt-list-header';
  var title = document.createElement('span');
  title.className = 'prompt-list-title';
  title.textContent = 'All Prompts';
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'prompt-list-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close prompt list');
  closeBtn.addEventListener('click', closePromptList);
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'All prompts');
  _promptListLastFocus = document.activeElement;
  header.appendChild(title);
  header.appendChild(closeBtn);
  sheet.appendChild(header);

  // Scrollable list — sorted by similarity
  var list = document.createElement('div');
  list.className = 'prompt-list-scroll';

  var sortedIndices = getSimilaritySortedIndices();
  for(var si = 0; si < sortedIndices.length; si++){
    (function(idx){
      var prompt = TIER_PROMPTS[idx];
      var colors = getCardColors(idx);
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'prompt-list-item';
      item.style.background = colors.bg;
      item.style.color = colors.fg;

      var text = document.createElement('span');
      text.className = 'prompt-list-item-text';
      text.textContent = prompt.text;
      item.appendChild(text);

      if(prompt.tiers){
        var badge = document.createElement('span');
        badge.className = 'prompt-card-badge';
        badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="16" height="16"><path d="M10.5026 5.01692L9.96661 3.65785C9.62068 2.78072 8.37933 2.78072 8.03339 3.65784L6.96137 6.37599C6.85576 6.64378 6.64378 6.85575 6.37599 6.96137L3.65785 8.03339C2.78072 8.37932 2.78072 9.62067 3.65784 9.96661L6.37599 11.0386C6.64378 11.1442 6.85575 11.3562 6.96137 11.624L8.03339 14.3422C8.37932 15.2193 9.62067 15.2193 9.96661 14.3422L11.0386 11.624C11.1442 11.3562 11.3562 11.1442 11.624 11.0386L14.3422 9.96661C15.2193 9.62068 15.2193 8.37933 14.3422 8.03339L12.9831 7.49738"/><path d="M16.4885 13.3481C16.6715 12.884 17.3285 12.884 17.5115 13.3481L18.3121 15.3781C18.368 15.5198 18.4802 15.632 18.6219 15.6879L20.6519 16.4885C21.116 16.6715 21.116 17.3285 20.6519 17.5115L18.6219 18.3121C18.4802 18.368 18.368 18.4802 18.3121 18.6219L17.5115 20.6519C17.3285 21.116 16.6715 21.116 16.4885 20.6519L15.6879 18.6219C15.632 18.4802 15.5198 18.368 15.3781 18.3121L13.3481 17.5115C12.884 17.3285 12.884 16.6715 13.3481 16.4885L15.3781 15.6879C15.5198 15.632 15.632 15.5198 15.6879 15.3781L16.4885 13.3481Z"/></svg>';
        badge.style.color = colors.fg;
        badge.style.opacity = '1';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        item.appendChild(badge);
      }

      item.addEventListener('click', function(){
        closePromptList();
        confirmPromptUse(prompt, function(){ applyPrompt(prompt); });
      });
      list.appendChild(item);
    })(sortedIndices[si]);
  }

  sheet.appendChild(list);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // Tap backdrop to close
  overlay.addEventListener('click', function(e){
    if(e.target === overlay) closePromptList();
  });

  // Escape closes; Tab stays inside the sheet
  overlay.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ e.preventDefault(); closePromptList(); return; }
    if(e.key === 'Tab'){
      var f = $$('button', sheet); if(!f.length) return;
      var first = f[0], last = f[f.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  // Animate in
  requestAnimationFrame(function(){
    overlay.classList.add('open');
    try { closeBtn.focus({preventScroll:true}); } catch(_){}
  });
}
var _promptListLastFocus = null;

function closePromptList(){
  var overlay = $('#promptListOverlay');
  if(!overlay) return;
  if(_promptListLastFocus && document.contains(_promptListLastFocus)){ try { _promptListLastFocus.focus({preventScroll:true}); } catch(_){} }
  _promptListLastFocus = null;
  overlay.classList.remove('open');
  overlay.addEventListener('transitionend', function(){ overlay.remove(); }, { once: true });
  // Fallback removal in case transitionend doesn't fire
  setTimeout(function(){ if(overlay.parentNode) overlay.remove(); }, 400);
}

/* Apply a prompt: set title, optionally reconfigure tiers */
function applyPrompt(prompt){
  var titleEl = $('.board-title');
  if(!titleEl) return;
  _promptUserSet = true;
  var oldTitle = titleEl.textContent;
  titleEl.textContent = prompt.text;
  hidePromptStack();

  // If prompt defines custom tiers, rebuild the board rows
  if(prompt.tiers && prompt.tiers.length){
    // Keep the old rows (detached, listeners intact) and where every placed
    // token lived, so the whole rebuild is one Undo step.
    var oldRows = $$('.tier-row', board);
    var homes = [];
    oldRows.forEach(function(r){
      var d = r.querySelector('.tier-drop');
      $$('.token', d).forEach(function(tok){ homes.push({ token: tok, drop: d }); });
    });
    // Move all placed tokens back to tray
    homes.forEach(function(h){ tray.appendChild(h.token); });
    // Remove existing rows
    oldRows.forEach(function(r){ r.remove(); });
    pushHistory({ type: 'rebuild', oldRows: oldRows, homes: homes, oldTitle: oldTitle });
    // Create new rows from prompt config
    prompt.tiers.forEach(function(t){
      board.appendChild(createRow({ label: t.label, color: t.color, image: t.image }));
    });
    uniformizeTierLabels();
    refreshRadialOptions();
  }
  scheduleSave();
}

/* ---------- Expose for image-search module ---------- */
window.buildImageToken = buildImageToken;
window.scheduleSave    = scheduleSave;

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
    uniformizeTierLabels();
    // tray defaults (pre-rendered with flat bg + random contrasting text, not custom)
    communityCast.forEach(function(n){
      var bg = DEFAULT_TOKEN_COLORS.hasOwnProperty(n) ? DEFAULT_TOKEN_COLORS[n] : nextPreset();
      tray.appendChild(buildNameToken(n, bg, false));
    });
  }

  // Start auto-save after initial load
  startAutoSave();
  updateTrayCount();

  // Title + prompt card stack
  var titleEl = $('.board-title');
  if(titleEl){
    // Show or hide cards based on whether title exists
    if(titleEl.textContent.trim()){
      _promptUserSet = true;
      hidePromptStack();
    } else {
      showPromptStack();
    }

    // On blur: if title is empty, show cards again
    on(titleEl, 'blur', function(){
      if(!titleEl.textContent.trim()){
        titleEl.textContent = '';
        _promptUserSet = false;
        showPromptStack();
        scheduleSave();
      }
    });
    // On input: if cleared, show cards; if has text, hide cards
    on(titleEl, 'input', function(){
      if(!titleEl.textContent.trim()){
        _promptUserSet = false;
        showPromptStack();
      } else {
        _promptUserSet = true;
        hidePromptStack();
      }
    });
  }

  // add tier
  on($('#addTierBtn'),'click', function(){
    animateBtn(this);
    var newRow = createRow({label:'NEW', color: nextTierColor()});
    newRow.classList.add('row-enter');
    board.appendChild(newRow);
    setTimeout(function(){ newRow.classList.remove('row-enter'); }, 350);
    uniformizeTierLabels();
    refreshRadialOptions();
    scheduleSave();
  });

  // creators
  function addNameFromInput(){
    var input = $('#nameInput');
    var name = input.value.trim();
    if (!name) {
      var bar = document.querySelector('.action-bar');
      input.classList.remove('shake');
      if (bar) bar.classList.remove('invalid-name');
      // force reflow so the animation restarts on rapid re-submit
      void input.offsetWidth;
      input.classList.add('shake');
      if (bar) bar.classList.add('invalid-name');
      setTimeout(function(){ input.classList.remove('shake'); }, 320);
      setTimeout(function(){ if (bar) bar.classList.remove('invalid-name'); }, 1400);
      live('Name required');
      input.focus();
      return;
    }
    tray.insertBefore(buildNameToken(name, $('#nameColor').value, true), tray.firstChild);
    input.value=''; $('#nameColor').value = nextPreset();
    refitAllLabels();
    updateAddReady();
    scheduleSave();
  }
  // Reflect input-has-content on the + button so it looks "armed"
  function updateAddReady(){
    var btn = $('#addNameBtn');
    var inp = $('#nameInput');
    if (!btn || !inp) return;
    btn.classList.toggle('ready', !!inp.value.trim());
  }
  on($('#addNameBtn'),'click', addNameFromInput);
  on($('#nameInput'),'input', updateAddReady);
  // Enter key submits name (item 7)
  on($('#nameInput'),'keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); addNameFromInput(); }
  });

  // --- Add Image dropdown ---
  var imgDropdown = $('#imgDropdown');
  var urlInputRow = $('#urlInputRow');
  var imgBtnWrap = document.querySelector('.img-btn-wrap');
  function syncDropdownChevron(){
    if (!imgBtnWrap || !imgDropdown) return;
    imgBtnWrap.classList.toggle('open', !imgDropdown.classList.contains('hidden'));
  }
  on($('#addImageBtn'), 'click', function(e){
    e.stopPropagation();
    if(imgDropdown) imgDropdown.classList.toggle('hidden');
    if(urlInputRow) urlInputRow.classList.add('hidden');
    syncDropdownChevron();
  });
  // Close dropdown on outside click
  on(document, 'click', function(e){
    if(imgDropdown && !imgDropdown.classList.contains('hidden')){
      var wrap = e.target.closest && e.target.closest('.img-btn-wrap');
      if(!wrap) { imgDropdown.classList.add('hidden'); syncDropdownChevron(); }
    }
  });
  // Upload option
  on($('#uploadBtn'), 'click', function(){
    $('#imageInput').click();
    if(imgDropdown) imgDropdown.classList.add('hidden');
  });
  // Link option — reveal URL input inline
  on($('#linkOptBtn'), 'click', function(){
    if(urlInputRow){
      urlInputRow.classList.remove('hidden');
      var inp = $('#imageUrlInput');
      if(inp) inp.focus();
    }
  });
  // Search images option
  on($('#searchImgBtn'), 'click', function(){
    if(imgDropdown) imgDropdown.classList.add('hidden');
    if(window.ImageSearch) window.ImageSearch.open();
  });

  // Image upload with compression
  var MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB raw — reject huge files
  on($('#imageInput'),'change', function(e){
    var rejected = 0;
    Array.prototype.forEach.call(e.target.files, function(file){
      if(!file.type || file.type.indexOf('image/')!==0){ rejected++; return; }
      if(file.size > MAX_UPLOAD_BYTES){
        showSaveToast('"'+(file.name||'image')+'" is too large (max 25MB)', true);
        return;
      }
      compressImage(file, 200, function(dataUrl){
        if (dataUrl) {
          tray.insertBefore(buildImageToken(dataUrl, file.name), tray.firstChild);
          scheduleSave();
        } else {
          showSaveToast("Couldn't read \""+(file.name||'image')+'"', true);
        }
      });
    });
    if (rejected) showSaveToast(rejected>1 ? rejected+' files skipped — images only' : 'That file isn’t an image', true);
    e.target.value = ''; // Reset so same file can be uploaded again
  });

  // Image URL input — validates with an Image() preflight so broken URLs surface as a toast
  function addImageFromUrl(){
    var urlInput = $('#imageUrlInput');
    var goBtn = $('#addUrlBtn');
    var url = urlInput ? urlInput.value.trim() : '';
    if (!url) return;
    if (url.indexOf('http') !== 0) {
      showSaveToast('URL must start with http:// or https://', true);
      return;
    }
    if (goBtn) { goBtn.classList.add('loading'); goBtn.disabled = true; }
    var probe = new Image();
    var done = false;
    var cleanup = function(){ if (goBtn) { goBtn.classList.remove('loading'); goBtn.disabled = false; } };
    probe.onload = function(){
      if (done) return; done = true;
      cleanup();
      // Show the token immediately; it's inlined in the background so it
      // persists across refresh and exports cleanly (raw URL if CORS blocks).
      tray.insertBefore(buildRemoteImageToken(url), tray.firstChild);
      scheduleSave();
      showSaveToast('Image added to storage');
      urlInput.value = '';
      if(imgDropdown) { imgDropdown.classList.add('hidden'); syncDropdownChevron(); }
    };
    probe.onerror = function(){
      if (done) return; done = true;
      cleanup();
      showSaveToast('Could not load that image — check the URL', true);
    };
    // Fail gracefully if nothing responds within 8s
    setTimeout(function(){
      if (done) return; done = true;
      cleanup();
      showSaveToast('Image took too long to load — try another URL', true);
    }, 8000);
    probe.src = url;
  }
  on($('#addUrlBtn'), 'click', addImageFromUrl);
  on($('#imageUrlInput'), 'keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); addImageFromUrl(); }
  });

  // Pull-down help drawer
  (function(){
    var drawer = $('#helpDrawer');
    var handle = $('#helpHandle');
    var helpTrayEl = $('#helpTray');
    var tips   = $('#helpTips');
    if(!drawer || !handle || !helpTrayEl || !tips) return;

    // Populate tips
    var tipData = isSmall() ? [
      'Tap anyone — in storage or already ranked — to pick their tier, send them back to storage, or delete them.',
      'Press and hold a ranked token for a moment, then drag to reorder it.',
      'Tap a tier name to rename it — a color dot and a delete button pop up on its corners.',
      'Press and hold a tier name, then drag up or down to reorder tiers.',
      'Tap a suggestion card to use it as your title, swipe it left to skip, or tap “Browse all prompts”.',
      'Add images by upload, pasted link or the built-in search. Tap an image token → Adjust image to reframe it.',
      'Save gives you a preview you can share, download or press and hold to keep.'
    ] : [
      'Drag tokens into tiers to rank them. Drag back to Image Storage to unplace. Or click a token, then press 1–9 for that tier.',
      'Click a tier name to rename it. Hover a tier to change its color or delete it.',
      'Drag a tier name up or down to reorder tiers.',
      'Click a suggestion card to use it as your title, press ← to skip, or open “Browse all prompts”.',
      'Add images by upload, pasted link or the built-in search.',
      'Double-click one of your own tokens to delete it — or, for images, to adjust the framing.',
      'Save downloads your board as a PNG. Ctrl/Cmd+Z undoes, ? opens this help.'
    ];
    tips.innerHTML = tipData.map(function(t){ return '<div class="tip">' + t + '</div>'; }).join('');

    var isOpen = false;
    var dragging = false;
    var startY = 0;
    var currentH = 0;
    var maxH = 0;
    var velocity = 0;
    var lastY = 0;
    var lastT = 0;

    function measure(){ maxH = tips.scrollHeight; }

    function snapOpen(){
      measure();
      isOpen = true;
      drawer.classList.add('animating','open');
      helpTrayEl.style.height = maxH + 'px';
      setTimeout(function(){ drawer.classList.remove('animating'); }, 460);
    }
    function snapClosed(){
      isOpen = false;
      drawer.classList.add('animating');
      drawer.classList.remove('open');
      helpTrayEl.style.height = '0px';
      setTimeout(function(){ drawer.classList.remove('animating'); }, 460);
    }

    // Click/tap toggle
    on(handle, 'click', function(e){
      if(dragging) return;
      if(isOpen) snapClosed(); else snapOpen();
    });

    // Drag interaction
    on(handle, 'pointerdown', function(e){
      if(e.button && e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      measure();
      dragging = false;
      startY = e.clientY;
      currentH = isOpen ? maxH : 0;
      velocity = 0;
      lastY = e.clientY;
      lastT = Date.now();

      // Remove CSS transition during drag
      drawer.classList.remove('animating');

      function onMove(ev){
        var dy = ev.clientY - startY;
        var now = Date.now();
        var dt = now - lastT;
        if(dt > 0) velocity = (ev.clientY - lastY) / dt;
        lastY = ev.clientY;
        lastT = now;

        if(!dragging && Math.abs(dy) > 4) dragging = true;
        if(!dragging) return;

        var raw = currentH + dy;
        // Rubber-band past limits
        var h;
        if(raw < 0){
          h = -Math.pow(Math.abs(raw), 0.6);
        } else if(raw > maxH){
          var over = raw - maxH;
          h = maxH + Math.pow(over, 0.6);
        } else {
          h = raw;
        }
        helpTrayEl.style.height = Math.max(0, h) + 'px';

        // Show open state when past threshold
        if(h > maxH * 0.15) drawer.classList.add('open');
        else drawer.classList.remove('open');
      }

      function onUp(){
        try{ handle.releasePointerCapture(e.pointerId); }catch(_){}
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        if(!dragging) return; // let click handler deal with taps

        var finalH = parseFloat(helpTrayEl.style.height) || 0;
        // Use velocity + position to decide open/close
        var shouldOpen = (velocity > 0.3) || (finalH > maxH * 0.35 && velocity > -0.3);
        if(shouldOpen) snapOpen(); else snapClosed();
        dragging = false;
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });

    // Idle peek animation to hint interactivity
    setTimeout(function(){
      if(isOpen) return;
      drawer.classList.add('peek');
      setTimeout(function(){ drawer.classList.remove('peek'); }, 1800);
    }, 2500);
  })();

  on($('#promptBrowseBtn'), 'click', function(){ openPromptList(); });

  enableClickToPlace(tray);
  refitAllLabels();
  live('Ready.');
});

/* ---------- Offline / flaky-connection support ---------- */
// Only over https (or local dev) — service workers aren't available elsewhere.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js')['catch'](function(){}); });
}

/* ---------- First-run onboarding (subtle, one-time, dismissible) ---------- */
(function(){
  var KEY = 'fstm_onboarded_v1';
  var SKIPPED = 'fstm_onboarded_skip_v1';
  try {
    if (localStorage.getItem(KEY) || localStorage.getItem(SKIPPED)) return;
  } catch(_){ return; }

  var activeStep = null; // {el: HTMLElement, teardown: Fn}
  var stepIdx = 0;
  var placementTokensSeenFirstPlace = false;
  var tourDone = false;

  // If the user already has content (returning via storage), don't onboard
  if (document.querySelector('#tray .token')) {
    try { localStorage.setItem(KEY, '1'); } catch(_){}
    return;
  }

  function finish(){
    tourDone = true;
    try { localStorage.setItem(KEY, '1'); } catch(_){}
    teardownActive();
  }
  function skipAll(){
    tourDone = true;
    try { localStorage.setItem(SKIPPED, '1'); } catch(_){}
    teardownActive();
  }
  function teardownActive(){
    if (activeStep && activeStep.teardown) activeStep.teardown();
    activeStep = null;
  }

  function positionAround(target, ring, tip, arrow, preferBelow){
    var r = target.getBoundingClientRect();
    var ringW = r.width + 16, ringH = r.height + 16;
    ring.style.left = (r.left + window.scrollX - 8) + 'px';
    ring.style.top  = (r.top  + window.scrollY - 8) + 'px';
    ring.style.width  = ringW + 'px';
    ring.style.height = ringH + 'px';

    // Tip: try below, flip above if it would go off-screen
    var tipW = 240;
    var tipH = tip.offsetHeight || 70;
    var below = preferBelow !== false;
    var spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < tipH + 24) below = false;

    var left = Math.max(8, Math.min(r.left + window.scrollX + r.width/2 - tipW/2, window.innerWidth - tipW - 8));
    var top  = below ? (r.bottom + window.scrollY + 14) : (r.top + window.scrollY - tipH - 14);
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
    tip.style.maxWidth = tipW + 'px';

    // Arrow
    var arrowLeft = Math.min(Math.max(r.left + window.scrollX + r.width/2 - left - 6, 14), tipW - 20);
    arrow.style.left = arrowLeft + 'px';
    if (below) {
      arrow.style.top = '-7px';
      arrow.style.transform = 'rotate(45deg)';
    } else {
      arrow.style.top = 'calc(100% - 6px)';
      arrow.style.transform = 'rotate(225deg)';
    }
  }

  function showStep(target, message, preferBelow){
    teardownActive();
    if (!target || !target.getBoundingClientRect) return;

    var ring = document.createElement('div');
    ring.className = 'coach-ring';
    ring.setAttribute('aria-hidden', 'true');

    var tip = document.createElement('div');
    tip.className = 'coach-tip';
    tip.setAttribute('role', 'status');

    var arrow = document.createElement('span');
    arrow.className = 'coach-tip-arrow';
    tip.appendChild(arrow);

    var msg = document.createElement('div');
    msg.textContent = message;
    tip.appendChild(msg);

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'coach-tip-skip';
    skip.textContent = 'Skip tour';
    skip.addEventListener('click', function(){ skipAll(); });
    tip.appendChild(skip);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'coach-tip-close';
    close.setAttribute('aria-label', 'Dismiss hint');
    close.innerHTML = '&times;';
    close.addEventListener('click', function(){ teardownActive(); });
    tip.appendChild(close);

    document.body.appendChild(ring);
    document.body.appendChild(tip);

    function reposition(){ positionAround(target, ring, tip, arrow, preferBelow); }
    reposition();
    setTimeout(reposition, 40); // after layout settles
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    activeStep = {
      teardown: function(){
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', reposition, true);
        if (ring.parentNode) ring.parentNode.removeChild(ring);
        if (tip.parentNode)  tip.parentNode.removeChild(tip);
      }
    };
  }

  function step1(){
    if (tourDone) return;
    var target = document.querySelector('.action-bar');
    if (!target) return;
    showStep(target, 'Add your own people or images here — or start ranking the ones already in Image Storage below.', true);

    var trayEl = document.querySelector('#tray');
    if (!trayEl) return;
    var obs = new MutationObserver(function(){
      if (tourDone) { obs.disconnect(); return; }
      if (trayEl.querySelector('.token')) {
        obs.disconnect();
        teardownActive();
        setTimeout(step2, 350);
      }
    });
    obs.observe(trayEl, { childList: true });
    // Stop observing after timeout so we don't leak
    setTimeout(function(){ obs.disconnect(); }, 60000);
  }

  function step2(){
    if (tourDone) return;
    var firstRow = document.querySelector('#tierBoard .tier-row .tier-drop');
    if (!firstRow) return;
    showStep(firstRow, 'Drag an item here to rank it.', false);

    // Dismiss as soon as any token enters any tier-drop zone
    var board = document.querySelector('#tierBoard');
    if (!board) return;
    var obs = new MutationObserver(function(muts){
      if (tourDone) { obs.disconnect(); return; }
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList' && m.target.classList && m.target.classList.contains('tier-drop')) {
          if (m.target.querySelector('.token')) {
            obs.disconnect();
            teardownActive();
            placementTokensSeenFirstPlace = true;
            setTimeout(step3, 400);
            return;
          }
        }
      }
    });
    obs.observe(board, { childList: true, subtree: true });
    setTimeout(function(){ obs.disconnect(); }, 300000);
  }

  function step3(){
    if (tourDone) return;
    // Wait until user has 3+ placed tokens before showing save hint
    function countPlaced(){
      return document.querySelectorAll('#tierBoard .tier-drop .token').length;
    }
    function attempt(){
      if (tourDone) return;
      if (countPlaced() >= 3) {
        var saveBtn = document.querySelector('#saveBtn');
        if (!saveBtn) { finish(); return; }
        showStep(saveBtn, 'Nice! Save as PNG anytime you\u2019re ready.', false);
        // Dismiss on save click or after 8s
        var onSave = function(){ saveBtn.removeEventListener('click', onSave); finish(); };
        saveBtn.addEventListener('click', onSave);
        setTimeout(function(){ saveBtn.removeEventListener('click', onSave); finish(); }, 8000);
      } else {
        setTimeout(attempt, 1500);
      }
    }
    setTimeout(attempt, 1500);
  }

  // Start after a short delay so the page settles
  setTimeout(step1, 900);
})();
