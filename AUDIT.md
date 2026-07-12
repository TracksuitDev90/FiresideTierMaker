# FiresideTierMaker — Full Project Audit

> **Status:** Items **1–19** and **21–28** were fixed in the follow-up commits on
> this branch (verified with an automated Playwright pass covering both desktop
> and mobile viewports). Item **20** (favicon / og:image / manifest) was
> intentionally left unaddressed. Line references below describe the code as it
> was **at audit time** and may have shifted.

Line-by-line review of `script.js`, `quadrant.js`, `battles.js`, `image-search.js`,
`index.html`, `style.css`, `quadrant.css`, `battles.css`, `image-search.css`, plus the
asset inventory. Findings are ranked most → least important. Each item was verified
against the actual code path (file:line refs included).

---

## 🔴 P1 — High-impact functional bugs

### 1. Typing a digit while a token is selected teleports the token
`script.js:1800` — the number quick-jump keydown handler never checks whether the user
is typing. Select a token, then click into the board title, tier name, or the name
input and type "1", "2024", etc.: every digit silently moves the selected token into
that tier and swallows the keystroke. The other shortcut handler (`script.js:1857`)
has a `typing` guard; this one needs the same.

### 2. Mobile radial picker overflows the screen with many tiers
`script.js:1306-1349` — the picker lays rows out as a fixed vertical list centered on
the viewport (`BTN_H 52 + GAP 10` each, no scrolling). Prompts ship with 7, 9, even
15 tiers ("D&D alignment" = 9, "The Office" = 15 → 920px tall). On a phone the top
and bottom tiers render off-screen and are unreachable — tokens can't be placed in
them at all. Needs a scrollable list / grid layout when `totalH > viewport`.

### 3. Quadrant "hidden in tray" link breaks after every reload → duplicate items
Pins persist `sourceTokenId` (`quadrant.js:772,833`), but token IDs are random per
page load (`script.js:647` `el.id = uid()`). After a refresh, `syncTrayVisibility()`
matches nothing, so every item placed on the quadrant reappears in the tray while its
pin stays on the chart — duplicates, and removing the pin no longer un-hides anything.
Persist a stable key (name/image key) instead of the DOM id, or re-link by content on
load.

### 4. "Save Bracket" mid-battle exports a blank image
`script.js:1553` routes Save (button *and* Ctrl/Cmd+S) to `saveBracket()` whenever
battle mode is active, but `battles.js:521` clones `#battleResults`, which is empty
until a champion is crowned. Saving before round 10 downloads an essentially blank
PNG with no explanation. Either disable Save until results exist or export the current
matchup view.

### 5. `touch-action:none` on every token blocks page scrolling on mobile
`script.js:648` sets `el.style.touchAction='none'` on all tokens. The tray is a dense
2-column grid of 99px circles covering most of the lower screen on phones — a scroll
gesture that starts on any token doesn't scroll the page. Only the 10-12px gaps
scroll. Tray tokens don't need `none` (they use tap→radial on mobile); `pan-y` there
would restore scrolling while keeping in-tier drag working.

### 6. Tier-label text is hardcoded white — fails on light tier colors
`script.js:339` (`chip.style.color='#ffffff'`) and `script.js:1339` (radial dots).
White on the default A-tier yellow `#F2D04E` is ~1.6:1 contrast; same for any light
custom color a user picks. A `contrastColor()` helper already exists at `script.js:60`
but is never called. Same fix applies to the export clone CSS (`color:#ffffff
!important`, `script.js:1639`).

### 7. Keyboard focus ring is invisible on all six main control buttons
`style.css:16` puts the focus ring in `box-shadow` via `:focus-visible` (specificity
0,1,0), but `#newBracketBtn/#addTierBtn/#undoBtn/#trashClear/#saveBtn/#themeToggle`
(`style.css:197-204`) set `box-shadow:none` with ID specificity (1,0,0), which wins.
Outline is `transparent`, so keyboard users get no focus indicator on the app's
primary controls. Fix: use `outline` for these, or add
`#saveBtn:focus-visible{...}`-level rules.

---

## 🟠 P2 — Medium bugs & data-loss footguns

### 8. A single tap on a prompt card can destroy all placements — no confirm, no undo
`script.js:2825` treats any non-drag tap on the top card as "use". If that prompt has
custom tiers, `applyPrompt` (`script.js:3043`) wipes every row and dumps all placed
tokens back to the tray. An accidental tap while scrolling = losing the whole board
state with no way back. Suggest: confirm when placements exist, or make the swap
undoable.

### 9. Deleting a tier row is not undoable
`script.js:416` — the row X moves tokens back to the tray (good) but removes the row
with no history entry. Undo covers token deletes and moves, so users reasonably expect
it here; a mis-tap on the X permanently loses the tier's name/color/position.

### 10. Drag from tray → quadrant isn't recorded in Undo history
`script.js:981` / `script.js:1089` skip `recordPlacement` for q-zones. Click-to-place
and keyboard placement *are* recorded, so undo behaves inconsistently depending on how
the pin got there.

### 11. Battle undo from the results screen desyncs the opponent pool
In `pickWinner` (`battles.js:352`), the final round never increments `poolIndex`, but
`battleUndo` (`battles.js:602`) always decrements it. Undoing from the champion screen
rolls the pool back one too far, so re-playing round 10 serves the wrong/duplicate
opponent.

### 12. Undo button state goes stale when switching modes
`setMode` (`quadrant.js:678`) relabels buttons but never resets `#undoBtn.disabled`.
Leave a battle after a few rounds → back in tier mode the button stays enabled with an
empty `historyStack` (clicks no-op), or stays disabled despite tier history existing.

### 13. Quadrant image pins inline full base64 into localStorage
`quadrant.js:774-787` stores `pin.dataset.pinSrc` (a data URL for uploaded/search
images) directly in `tm_quadrant`. The tier list moved image bytes to IndexedDB
precisely because this blows the ~5MB quota and drops the whole save; the quadrant
store still has the old failure mode. Reuse the `idb:` reference scheme.

### 14. Tiers cannot be reordered on mobile at all
`enableRowReorder` (`script.js:1227`) bails on touch devices and relies on HTML5
drag-and-drop otherwise. There's no touch alternative (no up/down buttons, no
long-press reorder), so phone users are stuck with tier order.

### 15. Mobile in-tier drag has no auto-scroll
Desktop drag calls `autoScrollForDrag` every frame; `enableMobileTouchDrag`'s `move()`
(`script.js:1153`) never does. On a long board, a placed token can't be dragged to a
tier that's off-screen.

### 16. `showConfirm` leaks a document keydown listener per open
`script.js:1487` — the Escape listener is only removed when Escape is pressed. Every
confirm dismissed via button/backdrop leaves a listener attached forever (each stale
listener calls `close()` on a detached overlay on future Esc presses).

### 17. Quadrant export has no busy state / double-click guard
Tier export sets `data-state="saving"` and disables the button; `exportQuadrantPng`
(`quadrant.js:919`) doesn't. Double-clicking Save in quadrant mode kicks off two
concurrent exports and downloads two files.

### 18. Tray counter counts tokens hidden by quadrant placement
`updateTrayCount` (`script.js:2176`) counts all `.token` in the tray including
`.q-placed-hidden` ones, so in quadrant mode the badge disagrees with what's visible.

### 19. Theme-color meta and first paint don't respect light theme
`index.html:6` hardcodes `#0a0a0a`; the theme is applied by JS at the end of `<body>`,
so light-theme users get dark browser chrome and a possible dark flash. Update
`meta[name=theme-color]` in `setTheme()` (and consider an inline `<head>` snippet that
sets `data-theme` before CSS paint).

---

## 🟡 P3 — Cleanups, dead code, consistency

### 20. Missing favicon, og:image, and web manifest
No favicon link at all (404 on every load); Open Graph has title/description but no
image, so link previews are text-only; `apple-mobile-web-app-capable` is present but
deprecated and there's no manifest. Cheap wins for perceived polish.

### 21. Repo litter — unused assets and a stray empty file
- `BlackClover` (empty file at repo root)
- Root images: `IMG_0078.png`, `IMG_0080.gif`, `IMG_0082.png`, `IMG_0083.png`
- `icons/IMG_0141/0143/0184–0192.png` (10 files), `icons/save.gif`, `icons/trash.gif`,
  `icons/image.gif`, `icons/undo.png`, `icons/pencil.png`
- Unused SVGs: `undo-left`, `layers-minimalistic`, `widget`, `add-square`,
  `round-arrow-down`, `stars`, `gallery-add`, `trash-bin-trash`
- `icons/squads/*.svg` (only the `.png` versions are referenced)

None are referenced by any HTML/JS/CSS.

### 22. Dead code
- `replayGif` (`script.js:54`) — no `.btn-gif` exists anywhere; the three call sites
  are no-ops.
- `contrastColor` (`script.js:60`) — never called (see item 6, it *should* be).
- `.radial-highlight` element + `updateHighlight`'s `radialHighlight` writes — always
  hidden, vestigial.
- Unused CSS: `.q-left-label`/`.q-right-label`, `.q-labels-row` (quadrant.css),
  `.bracket-round-cat` (battles.css), `.img-search-card.broken` (broken cards are now
  removed, not dimmed), `Q_DEFAULTS.*.bg` values in quadrant.js.
- ES5 polyfills for `padStart`/`matches`/`closest` (`script.js:1-30`) are pointless:
  the app hard-requires fetch, Promises, IndexedDB, PointerEvent, `color-mix()`,
  `:has()` — any browser needing the polyfills can't run it anyway.

### 23. Triplicated / duplicated helpers
Three separate Fisher–Yates shuffles (`shuffleArray`, `shuffleNewTierColors`,
battles.js `shuffle`); `boostSaturation`/`desaturate`/`colorToHsl` each re-implement
RGB↔HSL conversion. Consolidating shrinks the file and keeps behavior consistent.

### 24. Typography inconsistency between modes
`.token .label` is declared **Rubik** in CSS (`style.css:783`) but `fitLiveLabel`
force-overrides it to **Montserrat 900** at runtime, while battle circles keep Rubik
and bracket export forces Segoe UI. The same person's name renders in three different
typefaces across tier / versus / export. Pick one token face (and Rubik may then be
droppable from the font payload entirely).

### 25. Font pre-fetch cost on every load
`_preloadGoogleFont` (`script.js:550-578`) downloads both font CSS files plus every
woff2 subset and base64-encodes them on **every page load**, even if the user never
exports. Defer to first Save click (cache the promise).

### 26. Stale color values outside the design-token system
- Battle progress-dot glow uses `rgba(216,255,63,.4)` (`battles.css:61`) — the old
  neon; the token is now `#baf800`.
- `#newBracketBtn` gets a hardcoded `#36d278/#196f3e` in battles.css:391, fighting the
  pastel `--btn-teal-*` treatment style.css gives the same button.
- `battles.js:525` falls back to `'#121212'` for `--surface` (real dark surface is
  `#0a0a0a`).

### 27. Minor a11y leftovers
- Back cards in the prompt stack are tabbable (`tabindex=0`) but only the top card has
  key handlers — keyboard focus can land on inert cards.
- Quadrant radial (`openQuadrantRadial`) never sets `_radialLastFocus`, so focus isn't
  restored on close (tier radial does this correctly).
- `enablePointerDrag` calls `preventDefault()` on every pointerdown, which suppresses
  click-focus on tokens for desktop users.

### 28. Nits
- `fitChipLabel` comment says "10-48px" but `minPx = 12`.
- `.img-btn-wrap{position:relative}` declared twice (style.css:269, 346).
- `showConfirm`'s OK button is hardcoded to say "Clear" — fine today, wrong the moment
  the modal is reused for anything else.

---

## 💎 Design recommendations for a premium feel

1. **Fix contrast first** (items 6, 7) — nothing reads "unpolished" faster than
   unreadable tier labels and missing focus states.
2. **One typeface system** (item 24): Bowlby One for display, one face for tokens/UI,
   consistently across tier / quadrant / versus / exports.
3. **Consistent busy/feedback states**: tier export shows "Saving…"; quadrant and
   bracket exports should match (items 4, 17). Same for toast phrasing ("Saved!" vs
   `live()`-only messages in battles).
4. **Unify the green/teal accents** (item 26) so battles mode stops looking like an
   older skin of the app.
5. **Light-theme first paint** (item 19) — matching browser chrome + no dark flash is
   a subtle but very "native app" touch.
6. **Ship a favicon + og:image** (item 20) — the share-preview is part of the product
   for a social tier-list tool.
