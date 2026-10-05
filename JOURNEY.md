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

All four frames use one continuous mathematical helix. `filmState.progress` is
the single animated travel value; frame index contributes only a fixed offset.
`getHelixTransform(progress, index, geometry, settings, count)` calculates every
frame's position, depth, scale, opacity and orientation. There are no per-frame
reset tweens, modulo wraps, corner poses or disappear/reappear transitions.

The marker and reading segments advance the same film progress continuously.
Sine/cosine drive lateral travel and depth; a smooth longitudinal curve keeps
the finite ribbon inside the viewport. Rendered depth determines stacking.
The papers have real transparent gaps, and the active caption remains beside
the center spine. The previous caption dims as the next milestone approaches.
Tablet and mobile reduce radius/depth; resize remeasures the shared geometry.
The outro continues travel and gently fades the whole scene into the gallery.

To inspect the shared path locally, set `JOURNEY_CONFIG.debug.showFilmPath` to
`true` in `dist/journey-data.js`. Sample points use the same transform helper.
The guide is disabled unless the hostname is localhost/127.0.0.1/::1, even if
the flag is accidentally enabled in a deployed config. Production default is
`false`. `helix.frameSpacing`, `turns` and `focusAngle` live alongside the data.

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
reveal and no pinned helix. No-JavaScript visitors receive the four dates and
titles as a list. After changing dates, run
`node scripts/sync-journey-fallback.mjs` to regenerate that static list.

## Dependencies

`dist/vendor/gsap/Flip.min.js`: GSAP Flip 3.15.0, matching the existing GSAP
version. Source: https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/Flip.min.js .
The supplied GSAP standard-license header is retained. No new package manager,
WebGL, canvas image generation, or runtime CDN dependency is required.

## Validation

Both sites were checked in Chromium at 1440 × 1000, 820 × 1180 and 390 × 844.
Dates, generated marker/photo phases, line completion, non-overlapping pins,
the same paper DOM element, keyboard focus, Escape and forward-wheel resume
passed. Existing gallery frames, album spreads and wish form still activate.
No browser JS errors or failed local asset requests occurred.

Additional checks covered 320 × 640 and 740 × 390, resize phase preservation,
upward-swipe close, backdrop close without a scroll jump, and viewer cleanup
across breakpoints. A browser-only landscape-photo fixture verified fullscreen
contain sizing; a browser-only fifth milestone verified data-driven generation
and distance. These fixtures were not saved to either site's content. Reduced
motion and no-JS fallbacks expose all four milestones.

The continuous-helix revision was additionally checked across 1440 × 1000,
820 × 1180, 390 × 844, 320 × 640 and 740 × 390. All frames change transform
together; dense path samples remain continuous, fixed offsets remain unchanged,
and reverse scrolling restores travel. Both sites' four real photos passed
fullscreen open/close/resume checks. Film centering is reapplied on every render
to avoid transform-cache drift after GSAP Flip restores a viewed paper.
