# Wedding Memories — physical memory table

Both editions share the scene, camera, album and physical wish-card interaction.
Each edition retains its own original five frame photos, thirty album photos,
identity and date in `dist/memories-data.js`. Journey, hero, venue, countdown,
fonts and the album page engine are unchanged by this revision.

## Supplied artwork — 5 October 2026

The new `Downloads.zip` contains four already optimized transparent WebP files.
They are retained byte-for-byte, with no generated replacement or recompression:

- `table-complete.webp`: “Trang trí bàn cưới hoa đỏ trắng nến lung linh.webp”,
  1448 × 1086. White cloth, burgundy satin, all flowers, candles and vases are
  one complete composition. Its transparency reveals the existing burgundy section background; no white curtain or replacement backdrop is added.
- `frame.webp`: “Bộ khung ảnh cưới lãng mạn.webp”, 1774 × 887. This sprite
  includes another couple's sample photographs. A hollow SVG clip removes the
  entire sample-photo aperture and every neighbouring frame. The site's real
  HTML photograph is painted underneath the aperture. The clean portrait rim
  is rotated for the landscape frame; the supplied horizontal rim has a
  neighbouring stand overlapping it, so that rim is not displayed.
- Groom `money-box-au.webp`: “Hộp thiệp cưới hoa hồng và nến ấm áp.webp”,
  1122 × 1402, AU monogram.
- Bride `money-box-ua.webp`: “Hộp thiệp cưới monogram U A tinh tế.webp”,
  1198 × 1313, UA monogram.

Both boxes retain their own flowers/candles. Their long cloth foregrounds are
cropped and softly masked in CSS so the actual box bodies rest on the table,
without rectangular white foreground patches. Original files remain intact.
Per-edition provenance, dimensions and sizes are in `images/memories/manifest.json`.

## Geometry and rendering

`dist/memories-layout.js` owns all staging and artwork coordinates:

- World matches the full 1448 × 1086 table; background and interactive objects
  use the same percentage-based plane.
- Usable tabletop: x72–1374, back y666, front lip y752.
- Three rear frames (02, 03, 05) and two front frames (01, 04) form a small
  cluster on the left. Original photo order is preserved. Rotations stay under
  one degree; bottom-center origins and tight contact shadows ground the frames.
- The album occupies the empty upper-left pocket, with closed-cover center
  (170,420), 10° tilt and −2° rotation. A slim easel supports it with feet at
  y700; the easel is behind the complete table artwork so flowers naturally
  obscure the lower legs. The same album levels out and opens at camera focus.
- The AU/UA box stands to the right. The physical card rests between it and the
  album. Source coordinates identify each artwork's actual slot on the lid.
- Slot slope is about 4.9°. The card's visible clipped edge aligns to that line;
  its center follows the slot normal during insertion, including on resize.

`memories.js` renders the measured hollow frame shell over the real photograph.
Local inverse scaling rasterizes frame surfaces at 4× and box surfaces at 3×,
keeping them sharp through camera zoom without enlarging asset downloads.
Frame sprites, table, box, cover and preview photos decode before refresh.

The table is one image, not a separately revealed base and floral top. All
resting objects are already present at intro; only the shared camera settles
from 0.98 to 1. The background, cloth and flowers never assemble independently.
A restrained GSAP-driven edge scrim keeps existing ivory text/navigation legible
as the camera travels over the new white table during the wish-card sequence.

## Existing interaction flow

`intro` → `photo-0…4` → `album-focus` → `album-open` → `spread-*` →
`album-close` → `box-focus` → `card-lift` → `wishes` → `card-insert` →
`card-inserted` → `exit`.

`getFocusTransform()` measures actual bounds and converts them back into world
coordinates. Resizing recalculates the camera and slot. Journey and Memories
keep independent sequential pins. `CONFIG.overviewScale` (0.88) makes the whole
overview 12% smaller, including table, decor and resting objects. Desktop now
spans up to 84.48% of viewport width; mobile up to about 96.7%. The same scale
applies when returning to the table and exiting. Object focus compensates for
this scale so photos, album pages and the wish form keep their reading size.
All interactive objects remain visible; fullscreen viewers remain usable.

`memories-wish-scene.js` animates the same paper from its tabletop anchor to the
form and back into the measured slot. The box stays closed. Clipping begins only
at the slot; opacity drops only after 94% of the paper has entered. Typing freezes
the camera/card, and mobile keyboard height changes preserve the focused form.
Skipping or reversing never submits. Drafts stay in memory.

## Google Sheets callback

Both editions use the same deployed Apps Script endpoint in **dist/index.html**,
in `window.onWeddingWishSubmit` before `memories-interactions.js`:

`https://script.google.com/macros/s/AKfycbzc947ybInuKhcz-ZTjxeN6wxOy6NjkNDU5GamjESPbg_ETWWWIiz3DRe95uTQ8fRU/exec`

Destination: [wedding wishes Sheet](https://docs.google.com/spreadsheets/d/1HC8fRjSwbpfvHqad8sFujO46BaYlxz7ZWjJEAUJeA-k/edit), first tab `gift`.
The payload remains `name`, `message`, and `anonymous`; both editions share this
inbox and preserve their own thank-you message.

`apps-script/loi-chuc.gs` is repository reference only, not frontend code.
It opens the supplied Sheet ID explicitly. Updating that reference does not
update the deployed Apps Script; redeploy from the Apps Script editor if its
server code changes.

Success uses the callback's message; failed requests preserve the draft. No
localStorage success/demo fallback exists. The requested `no-cors` transport
cannot verify a Sheet row in frontend code. Verify actual delivery in `gift`
after submitting a real wish. Automated callback checks intercept fetch and do
not add test wishes to the live Sheet.

## Responsive / verification

Desktop, tablet and mobile use the same physical arrangement. Mobile shortens
scroll distance; reduced motion exposes all 35 photos and the form in normal
flow. The no-JS fallback retains all 35 linked photographs. Photo data, captions,
per-edition identities and unrelated sections were compared to the prior commit.

Checks cover overview contacts, camera focus, both monograms, frame apertures,
album flow, the angled card-slot clipping line, input/keyboard stability, skip
without a POST, mocked successful submission, no-JS/reduced motion and sequential
pin boundaries. Overview is checked at 1440, 820, 390 and 320 pixels wide.

After changing photo data, run `node scripts/sync-memories-fallback.mjs` from the
site root to regenerate only its no-JS Memories gallery.
