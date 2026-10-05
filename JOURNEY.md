# Hành trình của 2 đứa mình

The shared Journey implementation sits immediately before Wedding Memories.
It adds its own ScrollTrigger; the gallery, album engine, money box, wish card,
existing viewer, wedding photos, and all later sections remain independent.

## Dates and identity

Edit `dist/journey-data.js` for the first three dates and milestone titles.
The authoritative meeting date is **07.04.2024** (the later 2026 dates in the
brief were illustrative examples). Confession: **24.08.2024**; proposal:
**06.06.2025**.

`JOURNEY_CONFIG.siteVariant` reuses `WEDDING_MEMORIES_DATA.site.key` rather than
introducing a second site switch. Existing values are `groom` (nhà trai) and
`bride` (nhà gái). The wedding milestone reads the same site's `dateLabel`:
25.10.2026 for the groom, 24.10.2026 for the bride. The animation code contains
no dates. Both sites use byte-identical Journey JS/CSS and Flip files.

## Milestone photographs

The owner supplied `Photos.zip` and `24-25-10-2026.zip`. Both sites use all four personal photos
in the requested order, with the existing dates unchanged:

| Milestone | Original file | Published base name |
| --- | --- | --- |
| Làm quen | `07-04-2024.jpg` — laptop by the window | `journey-meet` |
| Tỏ tình | `24-08-2024.JPG` — mirror portrait | `journey-confession` |
| Cầu hôn | `06-06-2025.jpg` — couple, flowers and ring under a tree | `journey-proposal` |
| Đám cưới | `24-25-10-2026.png` — wedding portrait in the flower garden | `journey-wedding` |

Files live in `dist/images/journey/`. Each has a `-preview.webp` (long edge
1200px, quality 84) for the film and a `-full.webp` (up to 2560px, quality 90)
loaded only on viewer open. The originals are never upscaled. EXIF orientation
is applied before conversion, including the proposal image's orientation 5;
metadata is stripped from published WebP files. No retouching is applied.

The landscape meeting photo uses `fit: 'contain'` inside its film segment so
both the laptop and the window remain visible. All fullscreen images use
contain. The other film segments retain the existing portrait crop.

The fourth original is 1024 × 1536. Its preview is 800 × 1200; its fullscreen WebP retains the original resolution. Dates continue to come from each site's identity config.

The viewer uses the exact same paper element as the film frame, including
when a placeholder is shown. Configured fullscreen images use object-fit:
contain and retain their natural aspect ratio.

## Scroll architecture

`journey.js`: render from data, derive responsive geometry, and build separate
`intro`, `marker-N`, `photo-N`, and `outro` phases. A milestone is activated
before its photo-reading phase. The progress line uses scaleY; its final part
continues below the last marker to a visible decorative end cap.

`calculateJourneyScrollDistance()` sums the configured intro, marker and photo
lengths × milestone count, final hold, and outro, then multiplies by stage
height. Default desktop length is 9.15 viewport heights; mobile is 3.96.
Adding a fifth milestone adds a marker and photo phase automatically.

All four photographs belong to one ordered horizontal film strip. The single
`filmState.progress` value advances the scene and reading emphasis.
`getFilmTransform(progress, index, geometry, settings, count)` keeps the photos
in their original left-to-right order, with no orbits, mirrored backs or wraps.
Yaw stays within one degree and the photographs have no in-plane rotation.

`JOURNEY_CONFIG.flow.profile` defines four height landmarks: lower left, a broad
crest, a shallow central dip, then the larger upper-right wedding photograph.
This gives exactly two changes of vertical direction. Photo spacing leaves an
open central area beside the unchanged timeline and its captions. On desktop,
the complete composition drifts gently as a unit. Tablet and mobile follow the
same wider reel horizontally, keeping the current photograph readable to the
left of the date/title column. Off-screen cells stay on that continuous reel.

The marker and reading phases retain their original durations and progression.
Resize recomputes geometry and restores the logical phase. The outro continues
shared travel and settles into Wedding Memories. A development-only guide can
be enabled with `JOURNEY_CONFIG.debug.showFilmPath`; hosted origins ignore it.

`journey-viewer.js`: GSAP Flip opens the actual paper in a native dialog;
Flip.fit maps its return to the live film-frame bounds. The scene's scroll
position is retained. Close button, Escape and backdrop click return focus to
the originating button. Forward wheel, upward swipe or forward-scroll keys
close first and then advance by the user's scroll gesture; reverse wheel does
not unexpectedly advance. Native dialog and explicit Tab handling trap focus.
Cleanup restores overflow, smoother state, and the paper DOM node.

`motion.js`: creates Journey before Memories, disposes both with matchMedia,
and preserves the active experience's logical phase across resize. Existing
Memories animation modules are not edited for this feature.

Reduced motion shows four complete rows in normal flow with a mild opacity
reveal and no pinned reel. No-JavaScript visitors receive the four dates and
titles as a list. After changing dates, run
`node scripts/sync-journey-fallback.mjs` to regenerate that static list.

## Connected film surface

`dist/journey-ribbon.js` draws one translucent film surface through the photo
cells, with subtle leaders extending out of each viewport edge. The renderer
receives the same travel value and poses as the photos; there is no separate
animation clock or stationary background strip.

Each cubic segment covers the full distance between cell centers. Its control
points progress strictly left-to-right, and its height interpolates without
overshoot. This lets the curve bend gradually through the stock surrounding the
rectangular photo windows. Constraining bends to the short gaps between photo
edges would create tight elbows; this implementation deliberately avoids that.
Film width interpolates smoothly, with no necks, pinches or secondary waves.
Leaders rise very slightly and continue off screen without curling back.

The champagne rails use real punched perforations (SVG even-odd paths), spaced
by accumulated arc length across the complete reel. They continue over the photo
cells; separate CSS perforation rows are hidden in the enhanced scene. The
photos retain their original assets, crop modes and fullscreen viewer. There is
no transformation of their image content to match a bending film surface.

`JOURNEY_CONFIG.ribbon.stockWidth` supplies room around each photo; `holePitch`
controls regular perforation spacing and `patchesPerJoin` controls tessellation.
A maximum of 12px depth and minimal yaw give the stock a slight perspective;
no frame turns over. The ribbon sits behind the center timeline. Photo cells
remain above their film stock, so the material never washes over their images.
All colors and the main typography are retained.

SVG patches are allocated once and reused. No DOM measurements happen during
scroll. Identical travel/geometry skips ribbon work. Resize invalidates geometry,
and destroy removes all patches. Decorative paths ignore pointer input and are
hidden from accessibility APIs. The original photo buttons remain interactive. Keyboard focus on an off-screen
cell brings that cell to its reading phase on compact viewports.
Fullscreen locks the shared playhead, so photos and film freeze together. Reduced
motion omits the moving strip and retains the four accessible photo rows.

## Dependencies

`dist/vendor/gsap/Flip.min.js`: GSAP Flip 3.15.0, matching the existing GSAP
version. Source: https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/Flip.min.js .
The supplied GSAP standard-license header is retained. No new package manager,
WebGL, canvas image generation, or runtime CDN dependency is required.

## Validation

The horizontal film was checked at 1440 × 1000, 820 × 1180, 390 × 844,
320 × 640 and 740 × 390. Both rails advance monotonically left-to-right and
have exactly two broad direction changes. Frame order stays fixed and all
photos remain upright. Active captions have clear space beside the images.

Both sites retain all four supplied photos and their own wedding dates.
Fullscreen open, Escape close, forward-wheel resume, image aspect ratio,
reduced motion, responsive phase restoration and independent Journey/Memories
pins are checked. Full-resolution photos still load only on explicit opening.

Compact-screen Tab navigation brings off-screen cells into their reading phase.
Photo focus survives asynchronous image/layout refreshes; Enter opens the viewer
and Escape restores the same focused cell and scroll position.
