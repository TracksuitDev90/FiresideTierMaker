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
function animateBtn(btn){ if(!btn) return; btn.classList.remove('animate'); void btn.offsetWidth; btn.classList.add('animate'); setTimeout(function(){ btn.classList.remove('animate'); }, 300); }
function replayGif(btn){ var img=btn&&btn.querySelector('.btn-gif'); if(!img) return; var src=img.getAttribute('src').split('?')[0]; img.src=''; img.src=src+'?t='+Date.now(); }

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
/* Boost saturation: convert RGB→HSL, bump S, convert back */
function boostSaturation(hex, amount){
  var c=hexToRgb(hex), r=c.r/255, g=c.g/255, b=c.b/255;
  var max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  var h=0, s=0, l=(max+min)/2;
  if(d!==0){
    s=l>0.5?d/(2-max-min):d/(max-min);
    if(max===r) h=((g-b)/d+(g<b?6:0))/6;
    else if(max===g) h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  s=Math.min(1, s+amount);
  // HSL→RGB
  function hue2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
  var rr,gg,bb;
  if(s===0){ rr=gg=bb=l; } else {
    var q2=l<0.5?l*(1+s):l+s-l*s, p2=2*l-q2;
    rr=hue2rgb(p2,q2,h+1/3); gg=hue2rgb(p2,q2,h); bb=hue2rgb(p2,q2,h-1/3);
  }
  return rgbToHex(Math.round(rr*255),Math.round(gg*255),Math.round(bb*255));
}
/* Reduce saturation by amount (0-1) */
function desaturate(hex, amount){
  var c=hexToRgb(hex), r=c.r/255, g=c.g/255, b=c.b/255;
  var max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  var h=0, s=0, l=(max+min)/2;
  if(d!==0){
    s=l>0.5?d/(2-max-min):d/(max-min);
    if(max===r) h=((g-b)/d+(g<b?6:0))/6;
    else if(max===g) h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  s=Math.max(0, s-amount);
  function hue2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
  var rr,gg,bb;
  if(s===0){ rr=gg=bb=l; } else {
    var q2=l<0.5?l*(1+s):l+s-l*s, p2=2*l-q2;
    rr=hue2rgb(p2,q2,h+1/3); gg=hue2rgb(p2,q2,h); bb=hue2rgb(p2,q2,h-1/3);
  }
  return rgbToHex(Math.round(rr*255),Math.round(gg*255),Math.round(bb*255));
}

/* ---------- Theme (button shows TARGET mode) ---------- */
(function(){
  var root=document.documentElement;
  var toggle=$('#themeToggle');
  var prefersLight=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);

  // Sun icon SVG (orange center + lighter orange rays), Moon uses uploaded PNG
  var SUN_HTML = '<svg class="sun-svg" viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="5" fill="#e8700a"/><line x1="12" y1="1" x2="12" y2="4" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="23" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="12" x2="4" y2="12" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="12" x2="23" y2="12" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#f5a623" stroke-width="2" stroke-linecap="round"/></svg>';
  var MOON_HTML = '<img class="btn-icon moon-icon" src="icons/moon.png" alt="" width="22" height="22" />';

  setTheme(localStorage.getItem('tm_theme') || (prefersLight ? 'light' : 'dark'));

  if(toggle){
    on(toggle,'click', function(){ animateBtn(toggle); setTheme(root.getAttribute('data-theme')==='dark'?'light':'dark'); });
  }

  function setTheme(mode){
    root.setAttribute('data-theme', mode); localStorage.setItem('tm_theme', mode);
    var target = mode==='dark' ? 'Light' : 'Dark';
    if(toggle){
      var icon=$('.theme-icon',toggle), text=$('.theme-text',toggle);
      if(text) text.textContent = target;
      toggle.setAttribute('aria-pressed', mode==='light' ? 'true' : 'false');
      if(icon) icon.innerHTML = (target==='Light' ? SUN_HTML : MOON_HTML);
    }
    var isLight = mode==='light';
    $$('.tier-row').forEach(function(row){
      var chip=$('.label-chip',row), drop=$('.tier-drop',row);
      var color = chip && chip.dataset.color ? chip.dataset.color : '#8b7dff';
      if(chip){
        var _rgb = hexToRgb(color), _s = Math.max(_rgb.r,_rgb.g,_rgb.b)-Math.min(_rgb.r,_rgb.g,_rgb.b);
        chip.style.background = isLight ? (_s < 20 ? darken(color, 0.10) : boostSaturation(color, 0.12)) : desaturate(color, 0.12);
      }
      if (drop && drop.dataset.manual!=='true'){
        drop.style.background = tintFrom(color);
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
  del.innerHTML='<svg viewBox="0 0 24 24"><path d="M18.3 5.7L12 12l-6.3-6.3-1.4 1.4L10.6 13.4l-6.3 6.3 1.4 1.4L12 14.4l6.3 6.3 1.4-1.4-6.3-6.3 6.3-6.3z"/></svg>';

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
/* Canvas-based measurement with word-wrap simulation.
   Binary-searches for the largest font (10-48 px) where the label
   text fits inside the chip, allowing word-wrap across multiple lines
   but never breaking a word. */
function fitChipLabel(chip){
  if (!chip) return;
  if (chip.classList.contains('has-crest')) return;
  var text = chip.textContent.replace(/\s+/g,' ').trim();
  if (!text) { chip.style.fontSize = ''; return; }

  // Available space inside the chip (total size minus padding)
  var chipW = chip.clientWidth || chip.offsetWidth;
  var chipH = chip.clientHeight || chip.offsetHeight;
  if (!chipW) chipW = isSmall() ? 130 : 180;
  if (!chipH) chipH = 99;
  var availW = chipW - 16;   // 8px padding each side
  var availH = chipH - 12;   // 6px padding top + bottom

  var upper = text.toUpperCase();

  // Binary search: largest px in [minPx..maxPx] that fits
  var maxPx = 48, minPx = 12;
  var lo = minPx, hi = maxPx;
  while (lo < hi) {
    var mid = Math.ceil((lo + hi) / 2);
    if (labelFitsAt(upper, mid, availW, availH)) {
      lo = mid;       // fits — try larger
    } else {
      hi = mid - 1;   // overflow — try smaller
    }
  }

  chip.style.fontSize = lo + 'px';
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

  var isLight = document.documentElement.getAttribute('data-theme')==='light';
  var chipColor;
  if(isLight){
    // Grays (very low saturation) just get slightly darker in light mode instead of a color shift
    var _rgb = hexToRgb(color), _s = Math.max(_rgb.r,_rgb.g,_rgb.b)-Math.min(_rgb.r,_rgb.g,_rgb.b);
    chipColor = _s < 20 ? darken(color, 0.10) : boostSaturation(color, 0.12);
  } else {
    chipColor = desaturate(color, 0.12);
  }
  if(chip){ chip.dataset.color = color; chip.style.background = chipColor; chip.style.color = '#ffffff'; }
  if(del) del.style.background = darken(color, 0.35);
  if(drop){ drop.style.background = tintFrom(color); drop.dataset.manual = 'false'; }
  if(colorBtn){ var dot = colorBtn.querySelector('.color-dot-indicator'); if(dot) dot.style.background = colorPickDotColor(color); }
  if(colorInput) colorInput.value = color;
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
  }
  applyTierColor(node, cfg.color);

  on(chip,'input', function(){
    if(chip.classList.contains('has-crest')) return;
    uniformizeTierLabels();
    // Browser may re-scroll contenteditable after style changes;
    // reset scroll in the next frame so text stays left-aligned
    chip.scrollLeft = 0;
    requestAnimationFrame(function(){ chip.scrollLeft = 0; });
  });
  on(chip,'keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); chip.blur(); } });
  on(chip,'blur', function(){ if(!chip.classList.contains('has-crest')){ uniformizeTierLabels(); chip.scrollLeft = 0; } });
  if(!cfg.image) fitChipLabel(chip);

  /* Color picker — label wraps input so native click opens the dialog */
  on(colorBtn,'click', function(e){ e.stopPropagation(); });
  on(colorInput,'input', function(){ applyTierColor(node, colorInput.value); scheduleSave(); });
  on(colorInput,'change', function(){
    applyTierColor(node, colorInput.value); scheduleSave();
    node.classList.add('color-flash'); setTimeout(function(){ node.classList.remove('color-flash'); }, 350);
  });

  /* Reveal color dot on tap (mobile — no hover) */
  on(labelArea,'pointerdown', function(e){
    if(e.target.closest('.color-pick-btn') || e.target.closest('.row-del') || document.activeElement===chip) return;
    labelArea.classList.add('show-tools');
    clearTimeout(labelArea._toolTimer);
    labelArea._toolTimer = setTimeout(function(){ labelArea.classList.remove('show-tools'); }, 6000);
  });

  on(del,'click', function(){
    var tokens = $$('.token', drop);
    flipZones([drop,tray], function(){ tokens.forEach(function(t){ tray.appendChild(t); }); });
    node.remove(); uniformizeTierLabels(); refreshRadialOptions();
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
  { label:'UNKNOWN', color:'#71717a' }       // "do not interact" / unsure
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
  "Abby","Anette","Andruw","Authority","B7","Camryn","Cindy","Clamy","Clay","Cody","Cookies",
  "Denver","Devon","Dexy","Dior","Domo","Gavin","Harry","Haven","Katie","Kiev","Kikki",
  "Meegan","Mew's","Neil","NJ","Paper","Ray","Raymond","Safoof","Sky","Smitty","Tubawk","Versse","Vyken","Zwjk"
];

/* Fixed signature colors for specific cast members — never rotate */
var DEFAULT_TOKEN_COLORS = {
  'Clay':   '#C61937',
  'Cody':   '#8F949E',
  'Camryn': '#99748f',
  'Sky':    '#76a071',
  'Devon':  '#9457eb',
  'Versse': '#19852d',
  'Haven':  '#FFBC00',
  'Abby':   '#FFAEE6'
};

/* ---------- PRE-RENDERED CIRCLE PALETTE ---------- */
var BASE_PALETTE = [
  '#E57373','#F06292','#FF8A65','#FFB74D','#FFD54F',
  '#FFF176','#E6EE9C','#C5E1A5','#AED581','#81C784',
  '#80CBC4','#4DB6AC','#81D4FA','#4FC3F7','#64B5F6',
  '#9FA8DA','#7986CB','#B39DDB','#CE93D8','#BA68C8',
  '#D7CCC8','#BCAAA4','#A1887F','#B0BEC5','#90A4AE'
];

/* Token text: 40% darker than base, lightened for very dark backgrounds */
function pickTextColor(bgHex){
  var lum = relativeLuminance(hexToRgb(bgHex));
  if(lum < 0.12) return lighten(bgHex, 0.40);
  return darken(bgHex, 0.40);
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
  document.fonts.ready.then(function(){ _bowlbyReady = true; uniformizeTierLabels(); refitAllLabels(); });
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
_preloadGoogleFont('https://fonts.googleapis.com/css2?family=Bowlby+One&display=swap', 'Bowlby One', '400', function(css){ _bowlbyFontFaceCSS = css; });
_preloadGoogleFont('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap', 'Montserrat', '900', function(css){ _montserratFontFaceCSS = css; });
function measureText(text, fontWeight, px){
  if(!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = fontWeight + ' ' + px + 'px "Bowlby One",ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial';
  return _measureCtx.measureText(text).width;
}
function measureTokenText(text, fontWeight, px){
  if(!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = fontWeight + ' ' + px + 'px "Montserrat",ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial';
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

  var px = 22;
  for (; px >= 11; px--) {
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
  el.style.touchAction='none'; el.setAttribute('draggable','false');
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

    // Swipe-up (mobile) / double-click (desktop) to reveal delete
    var _swStartY = 0, _swStartX = 0, _swStartT = 0;
    function showDel(){
      $$('.token.show-del').forEach(function(t){ t.classList.remove('show-del'); });
      el.classList.add('show-del');
      clearTimeout(el._delDismiss);
      el._delDismiss = setTimeout(function(){ el.classList.remove('show-del'); }, 4000);
    }
    on(el, 'pointerdown', function(e){
      if(e.button && e.button!==0) return;
      _swStartY = e.clientY; _swStartX = e.clientX; _swStartT = Date.now();
      el._swipeHandled = false;
    });
    on(el, 'pointerup', function(e){
      if(!isSmall()) return;
      var dy = _swStartY - e.clientY; // positive = upward
      var dx = Math.abs(e.clientX - _swStartX);
      var dt = Date.now() - _swStartT;
      if(dy > 30 && dt < 400 && dy > dx * 1.5){
        el._swipeHandled = true;
        showDel();
        vib(12);
      }
    });
    on(el, 'dblclick', function(e){ e.preventDefault(); e.stopPropagation(); showDel(); });
  }

  // Attach all drag handlers; each checks isSmall() at event time
  if (window.PointerEvent) enablePointerDrag(el);
  else enableMouseTouchDragFallback(el);
  enableMobileTouchDrag(el);

  on(el,'click', function(ev){
    ev.stopPropagation();
    if(el._swipeHandled){ el._swipeHandled = false; return; }
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
  var img = document.createElement('img'); img.src=src; img.alt=alt||''; img.draggable=false; el.appendChild(img);
  return el;
}

/* ---------- History (Undo) ---------- */
var historyStack = []; // {itemId, fromId, toId, originBeforeId} or {type:'delete', element, parentId, beforeId}
function recordPlacement(itemId, fromId, toId, originBeforeId){
  if (!fromId || !toId || fromId===toId) return;
  historyStack.push({itemId:itemId, fromId:fromId, toId:toId, originBeforeId: originBeforeId||''});
  var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0;
}
function recordDeletion(element, parentEl, nextSibling){
  var parentId = ensureId(parentEl, 'zone');
  var beforeId = nextSibling ? ensureId(nextSibling, 'tok') : '';
  historyStack.push({type:'delete', element:element, parentId:parentId, beforeId:beforeId});
  var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0;
}
function undoLast(){
  var last = historyStack.pop(); if (!last) return;
  // Handle deletion undo — re-insert the removed element
  if (last.type === 'delete') {
    var parent = document.getElementById(last.parentId);
    if (!parent) return;
    if (last.beforeId) {
      var before = document.getElementById(last.beforeId);
      if (before && before.parentElement === parent) parent.insertBefore(last.element, before);
      else parent.appendChild(last.element);
    } else {
      parent.appendChild(last.element);
    }
    var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0;
    live('Restored deleted token');
    return;
  }
  // Handle placement undo
  var item = document.getElementById(last.itemId);
  var origin = document.getElementById(last.fromId);
  if (!item || !origin) return;
  var scrollSnap = window.pageYOffset;
  flipZones([item.parentElement, origin], function(){
    if (last.originBeforeId){
      var before = document.getElementById(last.originBeforeId);
      if (before && before.parentElement === origin){ origin.insertBefore(item, before); return; }
    }
    origin.appendChild(item);
  });
  // Prevent viewport shift on mobile after DOM move
  if (isSmall()) window.scrollTo(0, scrollSnap);
  var u = $('#undoBtn'); if (u) u.disabled = historyStack.length===0;
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
    live('Moved "'+(selected.innerText||'item')+'" to '+ (r?rowLabel(r): isQZone?'quadrant chart':'Image Storage') );
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

function autoScrollForDrag(clientY){
  var vh = window.innerHeight;
  if (clientY < _autoScrollEdge) {
    // Near top – scroll up; speed proportional to proximity
    var t = 1 - clientY / _autoScrollEdge;           // 0 at threshold, 1 at edge
    window.scrollBy(0, -Math.round(_autoScrollMax * t * t));
  } else if (clientY > vh - _autoScrollEdge) {
    // Near bottom – scroll down
    var t = 1 - (vh - clientY) / _autoScrollEdge;
    window.scrollBy(0, Math.round(_autoScrollMax * t * t));
  }
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
        var isQZone = zone.classList.contains('q-zone');
        if(isQZone){
          // Quadrant zone: clone token as pin, hide original in tray
          var qClone = typeof window.cloneTokenForQuadrant === 'function' ? window.cloneTokenForQuadrant(node) : null;
          var placed = qClone || node;
          var rect = zone.getBoundingClientRect();
          var pinH = 20;
          var nx = x - rect.left - 6;
          var ny = y - rect.top - pinH/2;
          if(typeof window.clampQPosition==='function'){
            var cl=window.clampQPosition(nx,ny,rect.width,rect.height,pinH,zone);nx=cl.x;ny=cl.y;
          } else { nx=Math.max(0,Math.min(nx,rect.width-60));ny=Math.max(0,Math.min(ny,rect.height-pinH)); }
          zone.appendChild(placed);
          placed.style.position = 'absolute';
          placed.style.left = (nx/rect.width*100)+'%';
          placed.style.top = (ny/rect.height*100)+'%';
          if(typeof window.bringQTokenToFront==='function') window.bringQTokenToFront(placed);
          // Hide original in tray
          if(qClone){
            flipZones([originParent], function(){
              if(originNext && originNext.parentElement===originParent) originParent.insertBefore(node, originNext);
              else originParent.appendChild(node);
            });
            node.classList.add('q-placed-hidden');
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
        live('Moved "'+(node.innerText||'item')+'" to '+ (rr?rowLabel(rr): isQZone?'quadrant chart':'Image Storage') );
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
      autoScrollForDrag(y);
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
      live('Moved "'+(node.innerText||'item')+'" to '+ (rr?rowLabel(rr): isQZone?'quadrant chart':'Image Storage') );
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

  on(node,'touchstart', function(e){ var t=e.touches[0]; if(!t) return; start(e,t.clientX,t.clientY);
    on(document,'touchmove', onTouchMove, _supportsPassive?{passive:true}:false);
    on(document,'touchend', onTouchEnd, false); }, _supportsPassive?{passive:false}:false);
  function onTouchMove(e){ var t=e.touches[0]; if(t) move(t.clientX,t.clientY); }
  function onTouchEnd(){ document.removeEventListener('touchmove', onTouchMove, false); document.removeEventListener('touchend', onTouchEnd, false); end(); }

  function loop(){
    raf=requestAnimationFrame(loop);
    autoScrollForDrag(y);
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
      dot.style.color = '#ffffff';
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
  // Capture scroll before DOM mutation to prevent viewport shift
  var scrollSnap = window.pageYOffset;
  flipZones([origin, zone], function(){ zone.appendChild(radialForToken); });
  // Restore scroll immediately after DOM move
  window.scrollTo(0, scrollSnap);
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
}
on(window, 'resize', refreshRadialOptions);

/* ---------- Custom confirm modal ---------- */
function showConfirm(title, msg, onConfirm){
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
  okBtn.textContent = 'Clear';

  actions.appendChild(cancelBtn);
  actions.appendChild(okBtn);
  card.appendChild(h);
  card.appendChild(p);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  on(cancelBtn, 'click', close);
  on(overlay, 'click', function(e){ if(e.target === overlay) close(); });
  on(okBtn, 'click', function(){ close(); onConfirm(); });
  // Esc to cancel
  function onKey(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown', onKey); } }
  document.addEventListener('keydown', onKey);
  okBtn.focus();
}

/* ---------- Clear / Undo ---------- */
on($('#trashClear'),'click', function(){
  replayGif(this);
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
    if(isQ){
      // Quadrant-only clear: remove quadrant clones and data in-place
      if(typeof window.clearQuadrants === 'function') window.clearQuadrants();
    } else {
      // Full clear: remove everything
      try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
      try { localStorage.removeItem('tm_quadrant'); } catch(e){}
      try { localStorage.removeItem('tm_mode'); } catch(e){}
      location.reload();
    }
  });
});
on($('#undoBtn'),'click', function(){
  animateBtn(this);
  if(typeof window.isBattleMode === 'function' && window.isBattleMode()){
    if(typeof window.battleUndo === 'function') window.battleUndo();
  } else {
    undoLast();
  }
});

/* ===== Save Tierlist (keeps on-screen circle size) ===== */
on($('#saveBtn'),'click', function(){
  // In quadrant mode, let quadrant.js handle the export
  if(typeof window.currentChartMode === 'function' && window.currentChartMode() === 'quadrant') return;
  // In battles mode, save the bracket as PNG
  if(typeof window.isBattleMode === 'function' && window.isBattleMode()){
    if(typeof window.saveBracket === 'function') window.saveBracket();
    return;
  }
  replayGif(this);
  $$('.token.selected').forEach(function(t){ t.classList.remove('selected'); });
  $$('.dropzone.drag-over').forEach(function(z){ z.classList.remove('drag-over'); });

  var panel = $('#boardPanel');

  var cloneWrap = document.createElement('div');
  cloneWrap.style.position='fixed'; cloneWrap.style.left='-99999px'; cloneWrap.style.top='0';

  var clone = panel.cloneNode(true);
  clone.style.width = '1200px';
  clone.style.maxWidth = '1200px';
  // Strip the panel's outer decoration — it's a page card effect, not part of the image.
  // Removing it prevents html-to-image from adding canvas padding for shadow bleed,
  // which would otherwise appear as a faint shadow at the left edge of every row.
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';

  // Export styles: hide UI chrome, force desktop layout, use real flex centering
  // html-to-image uses the browser's SVG foreignObject renderer so all CSS works correctly
  var style = document.createElement('style');
  style.textContent = [
    '.row-del{ display:none !important; }',
    '.token-del{ display:none !important; }',
    '.color-pick-btn{ display:none !important; }',
    '.color-pick-input{ display:none !important; }',
    // Always render at desktop column widths regardless of device
    '.tier-row{ grid-template-columns:180px 1fr !important; }',
    // Token container
    '.token{',
    '  width:99px !important;',
    '  height:99px !important;',
    '  position:relative !important;',
    '}',
    // Token label - proper flex centering (html-to-image renders CSS correctly)
    '.token .label{',
    '  display:flex !important;',
    '  align-items:center !important;',
    '  justify-content:center !important;',
    '  position:absolute !important;',
    '  top:0 !important;',
    '  left:0 !important;',
    '  width:99px !important;',
    '  height:99px !important;',
    '  text-align:center !important;',
    '  font-weight:900 !important;',
    '  white-space:nowrap !important;',
    '  padding:0 !important;',
    '  margin:0 !important;',
    '  box-sizing:border-box !important;',
    '}',
    // Tier label container — no shadow in a flat export image
    '.tier-label{',
    '  position:relative !important;',
    '  width:100% !important;',
    '  height:100% !important;',
    '  box-shadow:none !important;',
    '}',
    // Token drop zone — strip shadow so it doesn't bleed left onto the tier label
    '.tier-drop{',
    '  box-shadow:none !important;',
    '}',
    // chip-area fills the label box
    '.chip-area{',
    '  display:flex !important;',
    '  width:100% !important;',
    '  height:100% !important;',
    '}',
    // Tier label chip - flex centering + explicit font (correctly rendered by html-to-image)
    '.label-chip{',
    '  display:flex !important;',
    '  align-items:center !important;',
    '  justify-content:center !important;',
    '  width:100% !important;',
    '  height:100% !important;',
    '  font-family:"Bowlby One",sans-serif !important;',
    '  font-weight:400 !important;',
    '  text-transform:uppercase !important;',
    '  letter-spacing:0.5px !important;',
    '  line-height:1.1 !important;',
    '  text-align:center !important;',
    '  color:#ffffff !important;',
    '  padding:6px 8px !important;',
    '  margin:0 !important;',
    '  white-space:normal !important;',
    '  word-break:normal !important;',
    '  overflow-wrap:normal !important;',
    '  overflow:hidden !important;',
    '}',
    '.board-title-wrap{ display:block !important; text-align:center !important; margin-bottom:20px !important; }',
    '.board-title{ display:block !important; text-align:center !important; font-size:28px !important; white-space:normal !important; word-wrap:break-word !important; overflow-wrap:break-word !important; }',
    '.title-pen{ display:none !important; }',
    '.prompt-stack-wrap{ display:none !important; }',
    '.mode-toggle-wrap{ display:none !important; }',
    '#quadrantBoard{ display:none !important; }'
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
  var cloneLabels = $$('.token .label', clone);
  cloneLabels.forEach(function(lbl){
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

  if (typeof htmlToImage === 'undefined' || typeof htmlToImage.toPng !== 'function') {
    cloneWrap.remove();
    showSaveToast('Export library failed to load — check your connection');
    return;
  }
  // html-to-image uses the browser's own SVG renderer — text, flex, and grid all
  // render pixel-perfectly. Returns a data URL directly (no intermediate canvas).
  var exportOpts = {
    pixelRatio: 2,
    width: 1200,
    backgroundColor: cssVar('--surface') || '#ffffff',
    fetchRequestInit: { mode: 'cors', cache: 'no-cache' },
    cacheBust: true
  };
  var _exportFontCSS = (_bowlbyFontFaceCSS || '') + (_montserratFontFaceCSS || '');
  if (_exportFontCSS) exportOpts.fontEmbedCSS = _exportFontCSS;
  htmlToImage.toPng(clone, exportOpts).then(function(dataUrl){
    var boardTitle = ($('.board-title') || {}).textContent || '';
    var slug = boardTitle.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    var a=document.createElement('a'); a.href=dataUrl; a.download=(slug || 'tier-list')+'.png';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); }, 300);
    cloneWrap.remove();
    showSaveToast('Saved!');
  }).catch(function(err){
    cloneWrap.remove();
    showSaveToast('Export failed — try again', true);
    console.error('PNG export error:', err);
  });
});

/* ---------- Save toast feedback ---------- */
function showSaveToast(msg, isError){
  var existing = $('#saveToast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'saveToast';
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.classList.add('toast-out'); }, 1800);
  setTimeout(function(){ toast.remove(); }, 2200);
}

/* ---------- Dismiss delete overlay on outside click ---------- */
on(document,'click', function(e){
  if(!e.target.closest('.token')) $$('.token.show-del').forEach(function(t){ t.classList.remove('show-del'); });
});

/* ---------- Keyboard quick-jump (1..N) ---------- */
on(document,'keydown',function(e){
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
    live('Placed "'+(placed.textContent||'item').trim()+'" on quadrant');
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
    recordPlacement(selected.id,fromId2,zone.id,kbBeforeId2); vib(4); live('Moved "'+(selected.innerText||'item')+'" to '+rowLabel(row));
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
      var node = createRow({ label: rowData.label, color: rowData.color, image: rowData.image });
      var drop = node.querySelector('.tier-drop');
      rowData.tokens.forEach(function(tokData){
        if (tokData.type === 'name') {
          drop.appendChild(buildNameToken(tokData.name, tokData.color || '#7da7ff', !!tokData.custom, tokData.textColor));
        } else if (tokData.type === 'image') {
          drop.appendChild(buildImageToken(tokData.src, tokData.alt));
        }
      });
      board.appendChild(node);
    });
    uniformizeTierLabels();
    // Restore tray
    data.tray.forEach(function(tokData){
      if (tokData.type === 'name') {
        tray.appendChild(buildNameToken(tokData.name, tokData.color || '#7da7ff', !!tokData.custom, tokData.textColor));
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
  updateTrayCount();
  // Also trigger quadrant save if in quadrant mode
  if(typeof window.scheduleQuadrantSave === 'function') window.scheduleQuadrantSave();
}

/* ---------- Token counter ---------- */
function updateTrayCount(){
  var badge = $('#trayCount');
  if (!badge || !tray) return;
  var count = $$('.token', tray).length;
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
}

// Hook into mutations for auto-save
var _saveObserver = null;
function startAutoSave(){
  if (_saveObserver) return;
  var onMutate = function(){ scheduleSave(); updateTrayCount(); };
  _saveObserver = new MutationObserver(onMutate);
  _saveObserver.observe(board, { childList: true, subtree: true, characterData: true });
  _saveObserver.observe(tray, { childList: true, subtree: true });
  var titleEl = $('.board-title');
  if (titleEl) {
    on(titleEl, 'input', scheduleSave);
  }
}

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
// Pin the newest prompts first, shuffle the rest
var _newestCount = 5;
var _newest = TIER_PROMPTS.splice(TIER_PROMPTS.length - _newestCount, _newestCount).reverse();
shuffleArray(TIER_PROMPTS);
TIER_PROMPTS = _newest.concat(TIER_PROMPTS);
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
    e.preventDefault();
    card.setPointerCapture(e.pointerId);
    clearTimeout(_hintTimer);
    card.classList.remove('hint');

    /* #5 Ripple on press */
    spawnRipple(card, e.clientX, e.clientY);

    var startX = e.clientX, dx = 0, dragging = false;
    var longPressed = false;
    var cardW = card.offsetWidth || 300;
    var threshold = cardW * 0.25;
    card.style.transition = 'none';

    /* Long-press detection — opens scrollable prompt list */
    clearTimeout(_longPressTimer);
    _longPressTimer = setTimeout(function(){
      if(!dragging){
        longPressed = true;
        vib(12);
        try{ card.releasePointerCapture(e.pointerId); }catch(_){}
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        card.classList.remove('md-dragging');
        // Spring back the card
        card.style.transition = 'transform .3s cubic-bezier(.2,0,0,1), opacity .25s ease';
        card.style.transform = 'scale(1) translateY(0)';
        card.style.opacity = '1';
        openPromptList();
      }
    }, LONG_PRESS_MS);

    function onMove(ev){
      dx = ev.clientX - startX;
      if(!dragging && Math.abs(dx) > 4){
        dragging = true;
        clearTimeout(_longPressTimer);
        /* #1 Raise elevation on drag */
        card.classList.add('md-dragging');
      }
      if(!dragging) return;
      var rotate = dx * 0.06;
      var opacity = Math.max(0.5, 1 - Math.abs(dx) / cardW);
      card.style.transform = 'translateX('+dx+'px) rotate('+rotate+'deg)';
      card.style.opacity = opacity;
    }
    function onUp(){
      clearTimeout(_longPressTimer);
      if(longPressed) return;
      try{ card.releasePointerCapture(e.pointerId); }catch(_){}
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      /* #1 Remove drag elevation */
      card.classList.remove('md-dragging');

      if(!dragging){
        // Tap = use prompt (right-swipe shortcut)
        card.style.transition = 'transform .5s cubic-bezier(.2,0,0,1), opacity .3s ease';
        card.style.transform = 'translateX(120%) rotate(10deg)';
        card.style.opacity = '0';
        var pIdx = parseInt(card.dataset.promptIndex, 10);
        vib(6);
        setTimeout(function(){ applyPrompt(TIER_PROMPTS[pIdx]); }, 250);
        return;
      }

      if(Math.abs(dx) >= threshold){
        // Commit swipe
        var dir = dx > 0 ? 1 : -1;
        var flyX = dir * (cardW + 100);
        var flyRotate = dir * 16;
        card.style.transition = 'transform .5s cubic-bezier(.2,0,0,1), opacity .3s ease';
        card.style.transform = 'translateX('+flyX+'px) rotate('+flyRotate+'deg)';
        card.style.opacity = '0';
        vib(6);

        if(dir > 0){
          // Right swipe = apply prompt
          var pIdx2 = parseInt(card.dataset.promptIndex, 10);
          setTimeout(function(){ applyPrompt(TIER_PROMPTS[pIdx2]); }, 250);
        } else {
          // Left swipe = skip — promote existing cards smoothly
          advanceCardStack();
        }
      } else {
        // Spring back — Material standard decelerate
        card.style.transition = 'transform .3s cubic-bezier(.2,0,0,1), opacity .25s ease';
        card.style.transform = 'scale(1) translateY(0)';
        card.style.opacity = '1';
        scheduleHint();
      }
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  /* #10 Keyboard support — Enter/Space to apply, ArrowLeft to skip */
  on(card, 'keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      var pIdx = parseInt(card.dataset.promptIndex, 10);
      card.style.transition = 'transform .5s cubic-bezier(.2,0,0,1), opacity .3s ease';
      card.style.transform = 'translateX(120%) rotate(10deg)';
      card.style.opacity = '0';
      vib(6);
      setTimeout(function(){ applyPrompt(TIER_PROMPTS[pIdx]); }, 250);
    } else if(e.key === 'ArrowLeft'){
      e.preventDefault();
      var cardW2 = card.offsetWidth || 300;
      card.style.transition = 'transform .5s cubic-bezier(.2,0,0,1), opacity .3s ease';
      card.style.transform = 'translateX('+(-(cardW2 + 100))+'px) rotate(-16deg)';
      card.style.opacity = '0';
      vib(6);
      advanceCardStack();
    } else if(e.key === 'ArrowRight'){
      e.preventDefault();
      var pIdx3 = parseInt(card.dataset.promptIndex, 10);
      card.style.transition = 'transform .5s cubic-bezier(.2,0,0,1), opacity .3s ease';
      card.style.transform = 'translateX(120%) rotate(10deg)';
      card.style.opacity = '0';
      vib(6);
      setTimeout(function(){ applyPrompt(TIER_PROMPTS[pIdx3]); }, 250);
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
  closeBtn.className = 'prompt-list-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close prompt list');
  closeBtn.addEventListener('click', closePromptList);
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
        applyPrompt(prompt);
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

  // Animate in
  requestAnimationFrame(function(){
    overlay.classList.add('open');
  });
}

function closePromptList(){
  var overlay = $('#promptListOverlay');
  if(!overlay) return;
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
  titleEl.textContent = prompt.text;
  hidePromptStack();

  // If prompt defines custom tiers, rebuild the board rows
  if(prompt.tiers && prompt.tiers.length){
    // Move all placed tokens back to tray
    $$('.tier-drop .token').forEach(function(tok){ tray.appendChild(tok); });
    // Remove existing rows
    board.innerHTML = '';
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
    var name = $('#nameInput').value.trim();
    if (!name) return;
    tray.insertBefore(buildNameToken(name, $('#nameColor').value, true), tray.firstChild);
    $('#nameInput').value=''; $('#nameColor').value = nextPreset();
    refitAllLabels();
    scheduleSave();
  }
  on($('#addNameBtn'),'click', addNameFromInput);
  // Enter key submits name (item 7)
  on($('#nameInput'),'keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); addNameFromInput(); }
  });

  // --- Add Image dropdown ---
  var imgDropdown = $('#imgDropdown');
  var urlInputRow = $('#urlInputRow');
  on($('#addImageBtn'), 'click', function(e){
    e.stopPropagation();
    if(imgDropdown) imgDropdown.classList.toggle('hidden');
    if(urlInputRow) urlInputRow.classList.add('hidden');
  });
  // Close dropdown on outside click
  on(document, 'click', function(e){
    if(imgDropdown && !imgDropdown.classList.contains('hidden')){
      var wrap = e.target.closest && e.target.closest('.img-btn-wrap');
      if(!wrap) imgDropdown.classList.add('hidden');
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
  on($('#imageInput'),'change', function(e){
    Array.prototype.forEach.call(e.target.files, function(file){
      if(!file.type || file.type.indexOf('image/')!==0) return;
      compressImage(file, 200, function(dataUrl){
        if (dataUrl) {
          tray.insertBefore(buildImageToken(dataUrl, file.name), tray.firstChild);
          scheduleSave();
        }
      });
    });
    e.target.value = ''; // Reset so same file can be uploaded again
  });

  // Image URL input
  function addImageFromUrl(){
    var urlInput = $('#imageUrlInput');
    var url = urlInput ? urlInput.value.trim() : '';
    if (!url) return;
    if (url.indexOf('http') !== 0) { urlInput.value = ''; return; }
    var token = buildImageToken(url, '');
    tray.insertBefore(token, tray.firstChild);
    urlInput.value = '';
    if(imgDropdown) imgDropdown.classList.add('hidden');
    scheduleSave();
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
    var tipData = [
      isSmall()
        ? 'Tap a circle to choose a row. Drag placed circles to reorder.'
        : 'Drag circles into rows. Drag back to Image Storage to unplace.',
      'Tap a tier letter to rename it. ' + (isSmall() ? 'Tap' : 'Hover over') + ' a label to change its color.',
      'Tap a suggestion to use it as your title, or type your own.',
      'Paste an image URL or upload files to add custom images.',
      (isSmall() ? 'Swipe up on' : 'Double-click') + ' a custom token to delete it.'
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

  enableClickToPlace(tray);
  refitAllLabels();
  live('Ready.');
});
