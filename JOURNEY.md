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

All four photographs are cells of one compact, open 3D film coil around the
fixed vertical timeline. `filmState.progress` is the only animated material
coordinate. `getFilmTransform()` subtracts it from each cell's index, then derives
angle, x/y/z, tangent and opacity. Scale comes from real perspective, not per-cell size tweens. Previous photographs continue along the
same path: they never fly back to a starting position or wrap to another cell.

`JOURNEY_CONFIG.flow` defines angular spacing (2.12 radians), focus bearing and
material spacing. The responsive geometry caps the desktop radius at 282px.
Tablet and mobile reduce radius and depth. The material is one elliptic helix:

```
theta = focusAngle + (materialCoordinate - progress) * angularSpacing
x = radius * sin(theta)
y = centerY + (materialCoordinate - progress) * pitch
z = depth * cos(theta)
```

Depth is 76% of radius on desktop, 65% on tablet and 48% on mobile. The stock
moves in front of the central axis, around the side, behind it and back to the
front. Its continuous vertical rise and camera-relative travel never reset or
fold at a photo boundary. Rear cells become smaller through perspective and
more muted through opacity. The stock height stays constant throughout a turn;
the rise per full turn exceeds that height so adjacent turns remain separated.
Title and footer are kept clear by the existing softly bounded film volume.

The marker phase fills the timeline while the coil advances gently. The photo
phase rotates the whole film into its reading position and holds there; the
progress line stays still except for its final extension below milestone four.
The original total phase lengths remain unchanged. Resize recomputes geometry
and restores the logical phase. The outro continues shared travel and settles
into Wedding Memories. A development-only guide can be enabled with
`JOURNEY_CONFIG.debug.showFilmPath`; hosted origins ignore it.

`journey-viewer.js`: the selected cell straightens gently while scroll is locked,
then GSAP Flip opens its original paper in a native dialog;
Flip.fit maps its return to the live film-frame bounds. The scene's scroll
position is retained. Close button, Escape and backdrop click return focus to
the originating button. Forward wheel, upward swipe or forward-scroll keys
close first and then advance by the user's scroll gesture; reverse wheel does
not unexpectedly advance. Native dialog and explicit Tab handling trap focus.
Cleanup restores overflow, smoother state, the paper DOM node and its curvature.
The preparation step can be cancelled by Escape or resize; an opening request ID
prevents a cancelled preparation from opening a later dialog.

`motion.js`: creates Journey before Memories, disposes both with matchMedia,
and preserves the active experience's logical phase across resize. Existing
Memories animation modules are not edited for this feature.

Reduced motion shows four complete rows in normal flow with a mild opacity
reveal and no pinned reel. No-JavaScript visitors receive the four dates and
titles as a list. After changing dates, run
`node scripts/sync-journey-fallback.mjs` to regenerate that static list.

## Connected film surface

`dist/journey-ribbon.js` builds one analytic ruled surface. Photo cells and empty
stock are contiguous intervals of the same angular coordinate. Both top and
bottom rails, perforations, image pixels sample that surface. Decorative cell labels and serial numbers
are omitted so photographs fill the cell from one perforated rail to the other. There are no independent Bézier connectors, per-photo cylinders or
side-specific bends. At every cell boundary, positions and first derivatives
match exactly; changing the photo density cannot introduce a crease.

The subtle champagne stock has narrow rails and small real perforations
(SVG even-odd paths), spaced by accumulated arc length through both photo cells
and their connectors. Holes continue through the cell margins. No separate
cream card background or CSS perforation row floats above the film. The
original photographs and fullscreen viewer are unchanged. In-film textures use
`cover` to fill each cell, including the landscape photograph; fullscreen retains
`contain` and shows the complete original image.

`JOURNEY_CONFIG.ribbon.stockWidth` sets stock height around each photo;
`holePitch` controls perforation spacing and `patchesPerJoin` tessellates each
connector. Small projected SVG patches change depth order individually, placing
far stock behind the fixed time axis and near stock in front. Photo cells remain
above their own stock. Captions have a subtle local scrim and stay readable;
active opacity is 1, inactive opacity is 0.35–0.38.

SVG nodes are allocated once and reused (96 patches for four photographs).
Scroll performs no DOM geometry measurements. Identical progress/geometry skips
ribbon work, resize invalidates measurements, and destroy removes all patches.
The bounded film volume has a soft edge outside both timeline caps, so title,
footer and caps remain clear. Decorative surfaces ignore pointer input and are
hidden from accessibility APIs. Keyboard navigation brings distant cells into
their reading phase. Fullscreen freezes the same shared playhead, so photos and
stock stop together. Reduced motion retains four accessible normal-flow rows.

### Curved photo surfaces

`ribbon.photoSlices` controls 32 cached texture strips per photograph. Their
height is exactly `frameHeight × stockWidth × RAIL_INNER`, using the same
constant as the inner rail edges. The photo is vertically centered, with no
caption band, and spans the full cell width.
`framePlane().at()` evaluates the shared helix at each source-pixel interval;
`framePlane().tangent()` includes its vertical rise. A world-space `matrix3d`
maps each image strip using the helix chord, vertical ruling and surface normal.
Consequently photographs bend around both side turns and follow the diagonal
material tangent. The normal is guarded when the viewer straightens a rear cell.

Each strip receives a complete world-space transform. Nesting the strips inside
a rotated native button can flatten their paint at the side turn in browsers,
even when its DOM bounds appear correct. The strips therefore live beside the
semantic photo button, in its perspective/opacity group, and forward pointer
clicks to it. A small texture overlap prevents seams; width and background crop
are measured only on layout refresh, while scroll updates transforms and depth.
The original image is still used for alt text, static fallback and the fullscreen
viewer. Its file is unchanged; no edited or rasterized assets are
introduced. The viewer always shows the undistorted original.

Image decode is cached across matchMedia rebuilds. This avoids a second delayed
image refresh shifting a restored scroll position after resizing. Texture layers,
listeners and the brief GSAP straighten/restore tweens are disposed on cleanup.

## Dependencies

`dist/vendor/gsap/Flip.min.js`: GSAP Flip 3.15.0, matching the existing GSAP
version. Source: https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/Flip.min.js .
The supplied GSAP standard-license header is retained. No new package manager,
WebGL, canvas image generation, or runtime CDN dependency is required.

## Validation

Browser checks cover 1440 × 1000, 1280 × 720, 820 × 1180, 390 × 844,
320 × 640 and 740 × 390. The actual rendered rails meet exactly at every
cell/connector seam across sampled scroll positions. Near and far film patches
cross the axis's depth; focused photos and active captions remain clear of one
another, with no horizontal overflow. Both timeline caps remain visible.

Both sites retain the supplied photos, dates, fonts, colors and background.
Fullscreen open, Escape close, forward-wheel resume, touch dismissal, keyboard
access, reduced motion, responsive phase restoration and separate
Journey/Memories pins are checked. Full images load only when opened. A fifth
milestone fixture still creates its own marker/photo phases from data.

Analytic continuity checks across six viewport sizes measured boundary errors
below 6e-13 pixels and tangent dot products above 0.9999999999999994.
Browser-projected image strips matched the shared surface within 0.0011 pixels.
A viewer click temporarily straightens the selected image from that surface,
then returns it to the same playhead and reattaches its curved pixels.
