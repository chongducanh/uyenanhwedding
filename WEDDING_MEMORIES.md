# Wedding Memories — physical memory table

Both editions use the same scene, camera, physical wish card and closed-box
slot interaction. Site identity and all 5 frame / 30 album photographs remain
in each edition's existing `dist/memories-data.js`. Dates, venue, hero, Journey,
countdown and the established album page engine are not changed by this revision.

## Complete base photograph

The owner supplied `Ảnh ChatGPT 13_28_24 5 thg 10, 2026.zip`.
Its PNG is 1448 × 1086, containing the entire red velvet table, warm hall,
flowers, candles and pearls with no interactive objects baked into the photo.
`dist/images/memories/table-complete.webp` retains that full image, dimensions
and colors, at WebP quality 92 (about 338 KiB). No generated replacement,
cut-up table layers, duplicated floral images or synthetic pearl paths remain.
The old `table.webp` has been removed. Asset metadata is in `manifest.json`.

## Image coordinates and grounding

`dist/memories-layout.js` is the shared source of staging coordinates:

- World: the exact 1448 × 1086 photograph. Base and object plane have identical
  bounds; object styles are percentages of those bounds.
- Usable tabletop: x82–1370, y480–540. `point(u,v)` and `standing(...)` derive
  object positions from horizontal position and depth, with a real foot anchor.
- Rear row: photos 02, 03, 05. Front row: 01, 04. Original data order stays intact.
  Their natural, lightly overlapping cluster occupies about 34% of usable width;
  rotations are under one degree, with bottom-center origins.
- Closed album: front-center, about 20% of usable width, slight −0.6° rotation.
  The mount is a full two-page spread: the closed cover occupies half its width.
  A 78° local tilt projects the top-down page onto the shallow photographed plane.
  The unchanged album engine brings it forward and opens its pages for reading.
- Money box: right side, about 12.4% of usable width, bottom on the tabletop.
  The existing box artwork's transparent bounds are normalized in CSS; the slot
  anchor matches those corrected artwork bounds.
- Paper card: a 96px footprint between album and box, flat with a 2° rotation.
  It is the same DOM paper that later lifts, becomes the form and enters the slot.
- Shadows are specific to standing frames, a flat album and the box, close to
  their contact planes. Warm artwork filters are subtle; frame photographs are
  not recolored. Four tiny CSS petals overlap selected feet/edges. There is no
  foreground floral reconstruction.

`.mem-table` displays one full image. `.mem-object-layer` is an independent
flat painting plane over it, preventing the tilted book from intersecting the
background photograph. The book retains its own local 3D page-flip context.
Stacking: rear frames 20, front24, album26, box28, small petals30, focused60.
The projected wish paper uses its own screen layer for stable form interaction.

## Scene and scroll flow

The complete table **and every resting object are visible from the first state**.
Intro only settles the world camera from 0.98 to1; nothing is assembled in layers,
and frames/album/box never rise from their physical resting positions.

`intro` → `photo-0…4` → `album-focus` → `album-open` → `spread-*` →
`album-close` → `box-focus` → `card-lift` → `wishes` → `card-insert` →
`card-inserted` → `exit`.

`getFocusTransform()` measures actual client bounds and converts back to world
coordinates. The camera pans/scales the whole world. Overview fits all sides,
cloth and floor flowers without cropping. Width is capped at1250px; narrow or
short screens scale the same composition instead of repositioning objects.
Art is decoded before the first geometry refresh; resize recalculates camera
and slot coordinates. Journey and Memories keep independent, sequential pins.

## Physical card and submissions

`memories-wish-scene.js` projects the tabletop anchor into a screen-space paper.
It owns lift, foreground positioning, clipping through the measured slot and
subtle submitted confirmation. The box stays closed. A long local perspective
keeps the small resting card's foreshortening natural before it lifts.

`memories-interactions.js` retains the fullscreen image viewer and owns form
validation, in-memory drafts, focus/keyboard locks, success/error and cleanup.
Typing holds the card and camera. Skipping or reversing never submits data.
The same paper returns through the real slot; clipping starts at arrival, and
opacity drops only after94% of the sheet has entered. Each site's names and
AU/UA artwork remain independent. The bride now uses this same paper story
instead of its earlier hinged-box form.

Replace `APPS_SCRIPT_URL` in **dist/index.html**, in the inline
`window.onWeddingWishSubmit` callback before `memories-interactions.js`, with
that site's deployed HTTPS Apps Script `/exec` URL. The placeholder remains
unconfigured by request. `apps-script/loi-chuc.gs` is repository reference only.
There is no localStorage success/demo fallback. The callback's message supplies
the thank-you state; failed requests preserve the draft. The requested no-cors
transport cannot verify a Sheet row in frontend code; test that after configuring
the real URL. Local verification uses a mock callback, never a real guest wish.

## Responsive and fallback

The established album engine still renders10 desktop or15 mobile spreads.
Mobile shortens camera travel; tablet reduces the pin distance. Reduced motion
provides all35 photographs and a usable form in normal flow. The no-JS fallback
retains35 linked photographs. No global fonts, branding or page sections change.

## Validation — 2026-10-05

Chromium checks cover1440 × 1000,820 × 1180,390 × 844 and320 × 640 on both
editions. All resting feet and flat objects remain inside the source tabletop
plane; measured cluster/album/box ratios are34.0% /20.5% /12.4%. The complete
base and all objects are present even at the start of intro; no legacy base
request occurs. The full base, including floor flowers, fits every overview.

All five frame viewers and the album viewer open and restore scroll position.
Resizing preserves the active album photographs across10/15-spread pagination.
Card clipping meets the measured slot within1px at all four viewport widths.
Typing freezes the scene, including a simulated mobile keyboard height change.
Skipping issues no requests; a mock callback is called once on submit and the
card completes insertion. Placeholder failures retain the draft. No real Sheet
was contacted. Reduced-motion and no-JS checks expose all35 photographs.

After editing photo data, run `node scripts/sync-memories-fallback.mjs` from the
site root to regenerate only its no-JavaScript Memories gallery. Original photo
order, source URLs and per-site identity were compared with the prior commit.
