# Wedding Gallery / Wedding Memories

This revision replaces the two active portrait/ring galleries with a single
scroll-driven table scene. Their former markup is retained in the inert
`#legacy-wedding-gallery` template so it can be recovered without loading or
animating duplicate galleries.

## Architecture

```text
#memories
  .mem-stage                       pinned viewport
    .mem-heading                   screen-space chapter information
    .mem-camera
      .mem-world                   one stable 1440px coordinate system
        .mem-table / .mem-table-surface / .mem-decor
      .mem-contact × 7             shadows on the tabletop plane
        .mem-frame × photos.length
        .mem-album-mount            physical cover + two-sided paper leaf
        .mem-money-box              hinged front + interior
      .mem-table-foreground       flower crops and pearl strands
    .mem-wish-host                  untransformed, readable input plane
    .mem-caption / .mem-footer
body
  dialog.mem-viewer                outside all transformed ancestors
```

- `memories-data.js`: independent site identity, original photo IDs, captions,
  preview/full/thumbnail URLs and scene artwork. The two sites retain their
  separate names, dates, map pins and AU/UA artwork.
- `memories.js`: camera, the ten named phases, content-dependent scroll distance,
  photo focus, accessibility states and interaction locks. `CONFIG` at the top
  adjusts timing and framing. Positions derive from stable world offsets rather
  than transformed client rectangles, so camera moves cannot accumulate drift.
- `memories-album.js`: data-driven layouts; 10 spreads for 30 photographs on
  desktop, 15 two-photo spreads on mobile. A turning sheet has a front and back.
  Only current/next spreads are mounted. The full image is reserved for the viewer.
- `memories-interactions.js`: fullscreen dialog and a local wedding-wish form.
- Three namespaced CSS files separate scene, album and interactions.
- `motion.js` retains the existing wedding invitation and later chapters, creates
  the memories module inside `gsap.matchMedia()`, and disposes it before replacing
  ScrollSmoother at a breakpoint change.

## Motion and responsive behavior

The master timeline is assembled from `intro`, `photo-*`, `album-focus`,
`album-open`, `spread-*`, `album-close`, `box-focus`, `box-open`, `wishes`, and
`exit`. Every duration is measured in viewport-height units. The sum determines
ScrollTrigger's end distance, including when photo/page counts change.

The camera transforms the entire world. Individual photos do not merely scale
in place. Mobile uses shorter travel and reading segments. Reduced motion shows
all 35 photographs and the wish form in normal document flow, with no pin.

The viewer pauses the smoother and restores the exact position, focus and active
page. Form focus holds the camera until focus leaves or the visitor presses
“Tiếp tục xem thiệp”. No animation runs autonomously.

## Connecting wishes

The default `window.onWeddingWishSubmit(data)` saves a maximum of 30 wishes in
local storage per site. The UI explicitly says this has not sent a wish to the
couple. To connect a real endpoint, define an asynchronous callback before
`memories-interactions.js` loads, or replace it afterward and adjust the form's
notice accordingly. The payload contains the site identity, name, message and
anonymous preference; return an acknowledgement only after successful storage.
No external service, notification or email is configured by this revision.

## Supplied artwork

The complete six-image ZIP was received and all entries passed their CRC checks.
Original PNGs remain outside the published directory. WebP files preserve the
original dimensions and alpha channels, at quality 90.

| Artwork | Groom-side site | Bride-side site |
| --- | --- | --- |
| Table and flowers | `table.webp` | `table.webp` |
| Wooden frame | `frame.webp` | `frame.webp` |
| Album cover | `album-au.webp` — Anh & Uyên | `album-ua.webp` — Uyên & Anh |
| Money box | `money-box-au.webp` — AU | `money-box-ua.webp` — UA |

The table and flower layers display complementary CSS clips of the same supplied
transparent table image. This allows a sequential reveal without duplicating the
image download. The supplied wooden frame overlays each table photo.
Album covers use a square physical page shape and CSS framing to hide the
original mockup's surrounding background while retaining the supplied cover.
Each site includes only its own cover and box, plus shared table/frame artwork.

## Local validation

Checked on 2026-10-05 with Chromium at desktop, tablet and phone sizes:

- All 5 table photos and all 30 album photos preserve the IDs and image sources
  from their own site's previous galleries.
- Viewer click targets, Escape/close, focus and scroll restoration work.
- Desktop renders 10 spreads; mobile renders 15. The mobile scene is about
  12,170 pixels long at 390 × 844.
- Resizing preserves the same album photos across different pagination.
- Reduced motion exposes all 35 images without a pinned scene.
- Form input holds the camera; drafts survive breakpoint recreation.
- The two calendars, countdown times and map pins remain site-specific.
- No JavaScript errors, missing local assets or horizontal overflow were found.

The supplied artwork is additionally checked at desktop and mobile sizes for
framing, correct AU/UA identity, click targets and image loading.

## Table staging

The tabletop occupies world coordinates x=240…1200, y=460…635. Three rear
frames stand at y=490; two front frames stand at y≈595 and partially overlap
the back row. Their origins stay at the bottom center so small tilts retain a
contact point. The closed album rests at the front with a 62° tilt and −12°
rotation, and returns to the same pose after reading. The money box stands on
the right with its own footprint.

Seven separate contact shadows sit on the tabletop and share an upper-left
light direction. Cropped views of the original flower garland and lightweight
pearl paths overlap feet and edges. All ornamental layers ignore pointer
events. Focused photos and the open album rise above foreground decoration;
the normal physical stacking order returns in the overview.

The front cloth begins at the tabletop lip instead of behind the displayed
objects. The surface reuses the existing fabric image as its texture, so no
new image download or photo replacement is needed.
