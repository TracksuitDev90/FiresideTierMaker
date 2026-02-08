window.addEventListener('DOMContentLoaded', () => {
  // 1) Palette of 14 curated colors
  const brightColors = [
    '#FFEBAF', // Vanilla
    '#4C9DB0', // Moonstone
    '#19485F', // Ocean
    '#D9E0A4', // Lime
    '#F8C61E', // Sunburst
    '#252C37', // Midnight
    '#9A0002', // Cherry Cola
    '#EFE6DE', // Cream Vanilla
    '#004643', // Cyprus
    '#F0EDE5', // Sand Dune
    '#745275', // Lavender Fog
    '#8AB8C2', // Morning Tide
    '#0E5FB4', // True Blue
    '#D8D262'  // Mustard Seed
  ];

  // 2) Pick a random light variant
  const light = brightColors[Math.floor(Math.random() * brightColors.length)];

  // 3) Compute a darker variant by subtracting 30 from each RGB channel
  const amt = 30;
  const dark = (() => {
    const n = parseInt(light.slice(1), 16);
    let r = (n >> 16) & 0xFF;
    let g = (n >>  8) & 0xFF;
    let b = (n      ) & 0xFF;
    r = Math.max(0, r - amt);
    g = Math.max(0, g - amt);
    b = Math.max(0, b - amt);
    return '#' + ((1<<24)|(r<<16)|(g<<8)|b)
      .toString(16)
      .slice(1)
      .toUpperCase();
  })();

  // 4) Decide label text-color via relative luminance
  const [lr, lg, lb] = light.match(/\w\w/g).map(h => parseInt(h, 16));
  const lum = (0.299*lr + 0.587*lg + 0.114*lb) / 255;
  const textColor = lum > 0.5 ? '#000000' : '#FFFFFF';

  // 5) Apply these to CSS variables on :root
  const root = document.documentElement;
  root.style.setProperty('--slanted-bg-light',   light);
  root.style.setProperty('--slanted-bg-dark',    dark);
  root.style.setProperty('--slanted-text-color', textColor);

  // 6) Grab DOM elements
  // BUG FIX: bonus boxes no longer have the "box" class, so .box
  // only matches the 9 regular boxes per row (not the bonus box).
  const colorPicker    = document.getElementById("color-picker");
  const clearButton    = document.getElementById("clear-button");
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const saveButton     = document.getElementById("save-button");
  const inputs         = Array.from(document.querySelectorAll("#input-fields input"));
  const boxes          = Array.from(document.querySelectorAll(".box"));
  const bonusBoxes     = Array.from(document.querySelectorAll(".bonus-box"));

  let isPointerDown = false,
      currentColor  = colorPicker.value;

  // --- GRADIENT HELPER ---
  // Computes a subtle shade of the base color for position `index`
  // within `total` filled boxes. Goes from slightly darker (left)
  // to slightly lighter (right) across the row.
  function gradientShade(hexColor, index, total) {
    if (total <= 1) return hexColor;
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // t goes from 0 (first box) to 1 (last filled box)
    const t = index / (total - 1);
    // Range: -10% brightness to +10% brightness
    const factor = -0.10 + 0.20 * t;
    let nr, ng, nb;
    if (factor < 0) {
      // Darken: pull toward black
      nr = Math.round(r * (1 + factor));
      ng = Math.round(g * (1 + factor));
      nb = Math.round(b * (1 + factor));
    } else {
      // Lighten: pull toward white
      nr = Math.round(r + (255 - r) * factor);
      ng = Math.round(g + (255 - g) * factor);
      nb = Math.round(b + (255 - b) * factor);
    }
    nr = Math.max(0, Math.min(255, nr));
    ng = Math.max(0, Math.min(255, ng));
    nb = Math.max(0, Math.min(255, nb));
    return '#' + ((1 << 24) | (nr << 16) | (ng << 8) | nb)
      .toString(16).slice(1);
  }

  // --- SHARED FILL LOGIC ---
  // Fills all boxes in a row up to (and including) the target box,
  // applying the subtle gradient across the filled range.
  function fillRowUpTo(targetBox) {
    const row = Array.from(targetBox.parentNode.querySelectorAll(".box"));
    const i = row.indexOf(targetBox);
    if (i < 0) return;
    const count = i + 1;
    // Clear entire row
    row.forEach(b => {
      b.style.backgroundColor = "";
      b.classList.remove("filled");
    });
    // Fill up to i with gradient
    row.forEach((b, j) => {
      if (j <= i) {
        b.style.backgroundColor = gradientShade(currentColor, j, count);
        b.classList.add("filled");
      }
    });
  }

  // 7) Enable/disable the "Save as Image" button
  function checkSave() {
    saveButton.disabled = !inputs.every(i => i.value.trim());
  }
  inputs.forEach(i => i.addEventListener("input", checkSave));
  checkSave();

  // 8) Clear all fills
  clearButton.addEventListener("click", () => {
    boxes.forEach(b => {
      b.style.backgroundColor = "";
      b.classList.remove("filled");
    });
    bonusBoxes.forEach(b => {
      b.style.backgroundColor = "";
      b.classList.remove("maxed");
    });
  });

  // 9) Drag-to-paint helper
  // BUG FIX: check that the target is actually a .box before painting,
  // and use fillRowUpTo for consistent gradient + fill behavior.
  function handlePointerMove(evt) {
    if (!isPointerDown) return;
    if (!evt.target.classList.contains("box")) return;
    fillRowUpTo(evt.target);
  }
  document.addEventListener("pointerup", () => isPointerDown = false);

  // 10) Box event wiring
  boxes.forEach((box, idx, arr) => {
    box.tabIndex = 0; // make focusable

    // pointer events
    box.addEventListener("pointerdown", e => {
      e.preventDefault();
      isPointerDown = true;
    });
    box.addEventListener("pointermove", handlePointerMove);
    // BUG FIX: removed pointerleave handler that was breaking drag-to-paint
    // across adjacent boxes. The global pointerup handles end-of-drag.
    box.addEventListener("pointercancel", () => isPointerDown = false);

    // click to fill all up to this box (with gradient)
    box.addEventListener("click", () => {
      fillRowUpTo(box);
    });

    // keyboard support: Space/Enter to fill, arrows to navigate
    box.addEventListener("keydown", e => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        box.click();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = arr[idx+1] || arr[0];
        next.focus();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = arr[idx-1] || arr[arr.length-1];
        prev.focus();
      }
    });
  });

  // 11) Bonus-box "maxed" toggle + keyboard
  bonusBoxes.forEach(bonus => {
    bonus.tabIndex = 0;
    bonus.addEventListener("click", () => bonus.classList.toggle("maxed"));
    bonus.addEventListener("keydown", e => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        bonus.click();
      }
    });
  });

  // 12) Dark Mode toggle
  darkModeToggle.addEventListener("click", () => {
    const dm = document.body.classList.toggle("dark-mode");
    darkModeToggle.setAttribute("aria-pressed", dm);
  });

  // 13) Save as Image — hides controls so only the infographic is captured
  saveButton.addEventListener("click", () => {
    if (saveButton.disabled) {
      alert("Please complete before saving");
      return;
    }
    const controlsBar = document.getElementById("container");
    // Hide controls before capture
    controlsBar.style.display = "none";

    document.fonts.ready.then(() =>
      html2canvas(document.getElementById("infograph-container"), {
        scale: 2,
        useCORS: true
      })
      .then(canvas => {
        controlsBar.style.display = "";
        const link = document.createElement("a");
        link.download = "fireside-infograph.png";
        link.href     = canvas.toDataURL("image/png");
        link.click();
      })
      .catch(err => {
        controlsBar.style.display = "";
        console.error(err);
      })
    );
  });

  // 14) Color picker live update
  colorPicker.addEventListener("input", e => {
    currentColor = e.target.value;
  });

  // 15) Category tooltips — creates tooltip spans from data-description
  // attributes and handles both hover (CSS) and tap (JS) interactions.
  document.querySelectorAll(".category[data-description]").forEach(cat => {
    const tip = document.createElement("span");
    tip.className = "category-tooltip";
    tip.textContent = cat.dataset.description;
    cat.appendChild(tip);
  });

  // Toggle tooltip on click/tap for touch devices
  document.querySelectorAll(".category[data-description]").forEach(cat => {
    cat.addEventListener("click", e => {
      e.stopPropagation();
      const wasActive = cat.classList.contains("tooltip-active");
      // Close all other open tooltips
      document.querySelectorAll(".category.tooltip-active").forEach(c =>
        c.classList.remove("tooltip-active")
      );
      if (!wasActive) {
        cat.classList.add("tooltip-active");
      }
    });
  });

  // Close tooltips when tapping/clicking outside a category
  document.addEventListener("click", e => {
    if (!e.target.closest(".category")) {
      document.querySelectorAll(".category.tooltip-active").forEach(c =>
        c.classList.remove("tooltip-active")
      );
    }
  });
});