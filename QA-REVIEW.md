# FiresideTierMaker — QA Review (bugs, mobile, slow networks, design)

Follow-up to `AUDIT.md` (whose items 1–19 and 21–28 are already fixed). Nothing here
repeats a fixed item. Items are numbered continuously so you can pick them by number.

**How this was checked**
- Every JS/CSS/HTML file read in full.
- Behaviour reproduced in Chromium via Playwright, on desktop (1280×900) and phone
  (iPhone 13, 390×844). Phone gestures used real CDP touch events, so native scrolling
  and `touch-action` behave as on a device.
- Slow and blocked networks simulated by delaying or blocking the CDN, font and Wikipedia requests.

**Legend:** ✅ reproduced in the browser · 📐 measured · 🔍 clear from code (not reproduced)

> **Status:** Items **1–14, 16–30 and 33–41** are fixed on this branch. Each fix
> was checked by re-running the original reproduction in Chromium, on desktop and
> on iPhone-sized touch emulation, plus a desktop/phone regression pass.
> Not addressed (not selected): **15, 31, 32, 42, 43, 44**. Line references below
> describe the code at review time.
>
> Three more bugs turned up while fixing, and were fixed too:
> - **Quadrant pin drags jumped the page to the top.** The drag lock set
>   `overflow:hidden` on `<html>`/`<body>`, both `height:100%`. On phones this
>   dropped pins in the wrong quadrant.
> - **The desktop delete ✕ on custom tokens never worked.** Drag pointer capture
>   swallowed its click. The same applied to the new adjust-image button.
> - **Holding a token near a screen edge started auto-scrolling before the finger
>   moved.** Touch auto-scroll now waits for movement and uses a slimmer edge.

---

## 🔴 Critical — data loss or a core flow broken

### 1. Quadrant placements are erased by switching modes ✅
Place 3 pins → switch to **Tier List** → switch back to **Quadrant**: the chart is empty
(saved pins went 3 → 0). Leaving quadrant mode removes the pins from the page. The zone
MutationObserver (`quadrant.js:939-944`) sees that as an edit and saves the empty zones 800ms
later. `scheduleSave()` (`script.js:2317`) also re-saves the quadrant on every tier-board change,
so the empty state keeps overwriting storage.
*Fix idea:* only save quadrant data while in quadrant mode, or pause the observer during
`setMode` teardown (`quadrant.js:716-733`).

### 2. Renaming a tier is not saved ✅
Rename "S" → "GOAT", press Enter, wait: storage still says "S" and a reload reverts it. The
chip `input`/`blur` handlers (`script.js:341-350`) never call `scheduleSave()`, and the board
observer (`script.js:2363`) only watches `childList`, not text edits.
Related: pasting into a tier name keeps rich formatting and images. The board title strips
pasted formatting; tier names don't.

### 3. Phone: trying to scroll on the prompt card applies the prompt ✅
On a fresh board, a quick vertical flick on the prompt card replaced all 6 tiers with the 8
"Which era…" tiers. If the finger lifts after 500ms it opens the "All Prompts" sheet instead.
The page never scrolls. The card has `touch-action:none` (`style.css:469`), the "tap" test
only looks at horizontal movement (`script.js:2983-3010`), and there's no `pointercancel` handling.

### 4. Phone: the tier board barely scrolls, and scroll attempts move tokens ✅
A vertical swipe starting on a placed token dragged **Andruw from tier A to B** (and was
recorded in Undo). A swipe starting on a tier label doesn't scroll at all. Placed tokens
(`style.css:775`) and tier labels (`style.css:742`) are `touch-action:none`, and touch drag starts
instantly with no hold delay (`script.js:1147`), so once a board fills up there's almost nowhere to scroll from.
*Fix idea:* start the drag after a short hold (~200–250ms) with `touch-action:pan-y`, and treat quick vertical motion as scrolling.

### 5. "Clear Board → Undo" loses uploaded images ✅
Upload an image → Clear Board → do anything during the 5-second Undo toast (e.g. add a name)
→ Undo. The image token comes back **blank**. The first autosave after the reload runs image
cleanup (`script.js:2153-2163`), which deletes image data the cleared board no longer
references, including the data the Undo backup still points to.

### 6. Blocked site storage → empty app ✅
With `localStorage` blocked (Safari "Block All Cookies", strict privacy modes, some in-app
browsers), the page loads with **no tiers and no tokens**. `setTheme` reads/writes
`localStorage` without try/catch (`script.js:74, 81`) and the exception kills the rest of `script.js`.

---

## 🟠 High — broken behaviour users will run into

### 7. Image search shows results for the wrong query ✅
Search "dgo" (slow response), fix it to "dog" and search again: the grid shows the **"dgo"**
results and the "dog" search is silently dropped. A new search clears the grid but then
returns early while the old request is loading (`image-search.js:179-190`). Needs a
request token / `AbortController` so stale responses are discarded.

### 8. "N images added!" but nothing arrives on slow or stalled networks ✅
The status says "1 image added!" and the modal closes immediately. Tokens only appear
after each image is downloaded **again** to inline it, and with a stalled connection they
never appear (`image-search.js:515-532`, `script.js:721-734`). There's no timeout and
no placeholder. Pasted URLs are also downloaded twice (probe + inline, `script.js:3405-3417`).
*Fix idea:* insert the token right away using the already-loaded thumbnail, inline in the
background with a timeout.

### 9. Versus stuck on "LOADING…" when the tray is empty ✅
If everyone is already ranked in tiers, Versus shows "ROUND 1/10 · LOADING… · VS" forever.
The only message goes to screen readers (`battles.js:234`), and the tray is hidden in this
mode so there's no clue why. Versus also ignores tokens that are placed in tiers.

### 10. Versus: a token can battle itself ✅
With 3 tokens in the tray, 68 of 250 rounds were "X vs X". The next opponent is taken from
the pool without checking it against the current winner (`battles.js:355`).

### 11. "Clear Bracket" wipes progress instantly and leaves Undo enabled ✅
No confirm and no undo (unlike the other Clear actions). After restarting, the Undo button
stays enabled but does nothing (`restartBattle`, `battles.js:271-300`, never calls
`updateBattleUndoBtn`).

### 12. Phone: tapping a placed token does nothing useful ✅
It only gets a selection ring. There's no picker, no "back to Image Storage", no Delete
(`script.js:686-698, 851`). Moving someone from S to D means a long drag. Suggest opening the
same picker (plus "Back to storage" / "Delete") for placed tokens.

### 13. Undo claims "Undone" but does nothing after a prompt rebuilds the tiers ✅
History entries still point at the deleted tiers (`applyPrompt`, `script.js:3197`). Either clear
history on rebuild or make the rebuild itself undoable. Only show "Undone" when something changed.

### 14. Closed image-search dialog still takes keyboard focus ✅
After closing, the dialog is only `opacity:0` (`image-search.css:18`). Tabbing through the page
hits **7 invisible stops** inside it, and screen readers still see it. Use `visibility:hidden`
/ `inert` after the fade.
Other small accessibility leftovers 🔍: the quadrant picker doesn't move focus to its first option;
search cards use `aria-selected` on `role=listitem`; pasted-URL image tokens have no name
(announced as "item").

---

## 🟡 Slow connections and performance

### 15. Font stylesheets block the first paint ✅
With a 2s-slow font server the page stays **blank for ~2s**. There are two separate
render-blocking Google Fonts requests (`index.html:28-29`). Merge them into one
(`family=Bowlby+One&family=Montserrat:wght@900`), or self-host the two fonts and preload them.

### 16. The export library delays the whole app ✅
The html-to-image `<script>` is synchronous and sits before `script.js` (`index.html:184`).
With a 3s-slow CDN the app becomes usable at **3s instead of 0.1s**. It's only needed for Save,
so load it on the first Save press.

### 17. Save depends on a third-party CDN ✅
If jsDelivr and unpkg are blocked (school/work filters, some ad blockers), Save always fails
with "Export library failed to load". Self-host the file.

### 18. Every export re-downloads every image 🔍
`cacheBust:true` + `cache:'no-cache'` (`script.js:1846-1847`, `quadrant.js:1062-1063`) defeat the
browser cache, which makes saves slower on mobile data. Crest images and any non-inlined
URLs are affected.

### 19. Save has no timeout 🔍
If an image request stalls, the button stays on "Saving…" forever. Add a ~20s timeout that
resets the button with an error toast.

### 20. Large boards may fail to export on iPhone 📐
A 15-tier board with 33 tokens exports at 2400×4280 (**10.3 MP**). iOS Safari's canvas limit is
~16.7 MP and lower on older devices, so bigger boards can come out blank. Lower `pixelRatio`
automatically for tall boards.

### 21. No caching for repeat visits / no icon or manifest 🔍
Without a service worker, every visit on a bad connection re-fetches everything. The favicon,
share image and web manifest (old AUDIT item 20) are still missing.

---

## 🔵 Mobile UX and layout

### 22. Tiers fit one token per row on phones ✅📐
At 390px wide, each tier's token area is 184px, so tokens stack in one column: 4 people make a
**458px-tall tier**, and the tier-label block stretches the full height. Smaller tokens on
phones (~64–72px) plus a narrower label column (~88px) would fit 3 per row.

### 23. Image Storage is ~2,600px tall on phones ✅📐
Tray tokens are 144px circles in 2 columns (`style.css:901-904`) while placed tokens are 99px.
With the default cast, the tray alone is 2,638px and the page is 4,100px. Use 4 columns at
the same size as tier tokens.

### 24. Prompts are cut off on phones ✅📐
**67 of 70** prompts end in "…" at 390px, so people can't read what they're choosing. Allow two
lines (`-webkit-line-clamp:2`) and a taller card.

### 25. Saving on iPhone and in in-app browsers 🔍
On iOS the PNG goes through a download prompt into Files, not Photos. Discord's and
Instagram's in-app browsers often ignore `download` entirely, yet the toast still says
"Saved!". Use the Web Share API (`navigator.share({files})` → "Save Image" / send to Discord)
and fall back to download.

### 26. Tier tools cover every tier for 30s on load (phones) ✅
The × and color dot show on every tier label at startup: cluttered, and the × is easy to hit
by accident. Only reveal them after the user touches a tier.

### 27. Mis-tap risks 🔍
In Versus, a fast double-tap can also pick the next round's winner (the cards re-render
instantly). The prompt card ✓/✕ are only 28px.

### 28. Sticky hover on touch 🔍
Buttons, tokens and battle cards use `:hover` transforms that stay "stuck" after a tap on
phones. Wrap them in `@media (hover:hover)`.

### 29. Gesture edge cases 🔍
- Phone token drag has no `pointercancel` handler, so a system gesture mid-drag can leave a
  stuck ghost and a running animation loop (`script.js:1147-1243`).
- A quick upward flick on a custom placed token both drags it and reveals Delete, then
  swallows the next tap (`script.js:655-677`).
- The quadrant picker jumps the page to the top if the viewport resizes while it's open
  (`quadrant.js:1325` uses the current scroll offset, which is 0 while the body is locked).

### 30. Hidden or confusing features 🔍
- The phone help tip reads "Tap a tier label to rename it. Tap a label to change its color."
- The long-press "All Prompts" list isn't mentioned anywhere, can't be opened by keyboard, and has no Escape.
- The first-run tip says "upload images or type a name to add items" while 33 people are already in storage.

---

## 🎨 Design cohesion and polish

### 31. Too many separate colour systems
Neon-lime brand, violet accent, pastel control buttons, earthy prompt-card pairs, Tailwind
tier colours, Material-pastel tokens, and lime + violet progress dots. Picking one accent
and deriving the others from it would make the app read as one product.

### 32. Hard-to-read token names 📐
9 of the 33 default tokens are below 3:1 contrast even for large text: Devon 2.3, Versse 2.4,
Camryn 2.6, Safoof 2.8, B7 2.8, Kikki 2.8, Cody 2.9, Gavin 2.9, Raymond 2.9. Keep the tonal
look but push the text darker or lighter until it clears 3:1.

### 33. The colour picker looks unfinished
The native colour input renders as a **square inside a white circle** in the action bar.
Styling `::-webkit-color-swatch` / `::-moz-color-swatch` as a borderless circle fixes it.

### 34. Tier label text flips between black and white
Neighbouring labels alternate (MICHAEL white, JIM black; RATED ACCURATELY white among black),
which looks uneven. Use one consistent treatment.

### 35. The theme toggle is a full-size action button
On phones it sits alone on its own row. Moving it to a small icon in the header lets the four
board actions sit in a clean 2×2 grid.

### 36. Disabled Undo looks muddy
The desaturated yellow reads as dirty beige-grey. A lighter/outlined disabled style would look cleaner.

### 37. "Clear Quadrants" wraps to two lines on phones
Shorten the label or tighten the button.

### 38. Tier picker (phone)
Long names touch the pill edges. Showing **which token is being placed** at the top (a small
preview) would feel much more polished.

### 39. Versus visuals don't match tier mode
Battle circles are flat (no rim texture like tier tokens), the name appears twice (inside the
circle and below), and the champion banner gradient still uses the old neon
`rgba(216,255,63,…)`.

### 40. Quadrant tints look muddy in dark mode
The red/amber zones read as maroon/olive. Slightly lighter or more saturated tints, or a soft gradient, would help.

### 41. Image crop
Search results show whole images, but tokens crop them to a circle, so faces get cut. Preview the
circle crop in search, and consider a simple zoom/position adjust for image tokens.

### 42. Typography
Three families: Bowlby One, Montserrat, and the system font for the title and headings.
Montserrat is only loaded at weight 900 while the CSS asks for 700/800. Consider Bowlby for
headings and one face for everything else.

### 43. Export look
Dark mode always exports a dark PNG. Offer a light/dark export choice and a subtle
"made with FIRESIDE" mark, which helps when lists get shared.

### 44. Empty / zero states
Beyond #9, give Versus and Quadrant friendly empty states (what to do next), matching the
tier board's empty hint.
