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

## Four intentional photo placeholders

No milestone-specific photographs have been selected by the owner yet. The
four separate film frames therefore show typographic paper placeholders; they
do not invent event photographs or reassign existing wedding photos.

Add the chosen files at:

- `dist/images/journey/journey-meet.jpg`
- `dist/images/journey/journey-confession.jpg`
- `dist/images/journey/journey-proposal.jpg`
- `dist/images/journey/journey-wedding.jpg`

Then set `imageReady: true` on the corresponding data entry. Alternatively,
point `image` at an approved WebP image in the project. Update `alt` to match
its actual content. Optional `full` loads a larger image only after a click;
optional `width` / `height` records original dimensions. Until `imageReady`
is enabled, no request is made to a nonexistent image path. Failed images
fall back to the same paper placeholder.

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

Curated back / approaching / focus / crossing / passed / settle transforms
control x/y/z, scale, rotationY and rotationZ. Layering follows depth. Four
individual film papers leave genuine transparent gaps around the center spine.
Tablet reduces movement; mobile uses a shallow helix. Timeline endpoints stay
inside the viewport. Outro settles the film around the completed timeline and
fades gently into the existing gallery palette, without an empty/black screen.

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
