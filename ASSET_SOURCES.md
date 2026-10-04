# Lễ vu quy — wedding photographs

The photographs were supplied by Đức Anh and Nhật Uyên in their Google Drive
folder on 2026-10-04. This bride-side invitation reuses the same optimized wedding album as the groom-side site.

- Opening invitation: retouched `Hình album/AUT01161.JPG`.
- Closing invitation: original `Hình album/AUT01628.JPG`.
- Five portrait coverflow photographs: `Hình bàn`, in filename order.
- Thirty album photographs: `Hình album`, in filename order.
- The schedule reuses `AUT01461.JPG` and `AUT00786.JPG` from the album.
- The countdown reuses the optimized AUT00786 preview as its blurred background.
- AUT01487 appears in both the gate and album folders; its WebP is shared.

There are 36 unique originals, totaling 381,679,697 bytes. Original files and
retouch masters are preserved outside the published site. Selected photographs
receive subtle groom skin cleanup; distant faces retain the original detail.
The generated `dist/images/photo-manifest.json` records each photograph and its
retouch state, derivative dimensions and byte sizes.

## Delivery

`scripts/prepare-photos.py --source <original-folder> --edits <retouch-folder>`
handles EXIF orientation, responsive resizing and WebP encoding. It does not
perform skin retouching. After rebuilding, run `scripts/apply-photo-manifest.py`
to update image dimensions and responsive sources in the HTML.

- WebP thumbnails: maximum edge 192px, quality 70.
- Gallery previews: maximum edge 960px, quality 77.
- Responsive content: widths 480px and 960px, quality 78/81, without upscaling.
- Full-image viewer: maximum edge 1920px, quality 84, without upscaling.
- The full frame is preserved in every file; the viewer uses `object-fit:contain`.
- Full album images load when opened. Gallery textures initialize near the album;
  texture uploads are bounded to 512px on mobile and 768px on larger screens.
- No original JPEGs are shipped to visitors. Browser assets contain no EXIF data.

## Full-width opening and closing photographs

The two full-width scenes have separate high-quality WebP exports at widths
960, 1440, 2048 and 3072px, quality 90. Responsive `srcset` and `sizes` account
for display density and the visible cover crop; the album keeps its light assets.
The opening remains eager/high priority and the closing loads lazily.

- AUT01161 uses the approved natural skin retouch. Its 1024×1536 master is
  upsampled to a maximum 3072×4608 for delivery; this is not native camera detail.
- AUT01628 uses the original at upright 3072×4608. The groom's intentional
  foreground defocus is preserved. No upsampling is needed.
- `scripts/prepare-hero-photos.py --opening <retouched-png> --closing <original-jpg>`
  creates the dedicated variants. `dist/images/hero-manifest.json` records input
  dimensions and explicitly marks the upsampled outputs.
- The HTML uses `data-hero` so rebuilding album derivatives cannot overwrite
  the higher-quality opening/closing sources.

## Envelope paper and motion references

- `envelope-paper.webp` and `envelope-paper-mobile.webp` are original AI-generated
  burgundy embossed botanical paper, created for this site on 2026-10-03.
- The folding invitation is implemented with HTML/CSS surfaces and GSAP.
  Reference: https://www.pinterest.com/pin/36028865765864684/
- The portrait section implements a shallow 3D coverflow with GSAP and a blurred
  selected-photo background. Reference:
  https://www.pinterest.com/pin/450711875208051621/
- Reference videos are not included in the site.
