"""Build responsive WebP derivatives from the supplied wedding photographs.

Originals and retouch masters stay outside the published directory. This script
only orients, resizes and encodes images; it does not perform facial retouching.
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageOps

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--edits', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = root / 'dist/images'
def prepare(original):
    edited = args.edits / (original.stem + '.png')
    master = edited if edited.exists() else original
    with Image.open(master) as image:
        photo = ImageOps.exif_transpose(image).convert('RGB')
        entry = {'id': original.stem.lower(), 'original': original.name,
                 'retouched': edited.exists(), 'variants': {}}
        for name, edge, quality in [('thumb', 192, 70), ('preview', 960, 77),
                                    ('480', 720, 78), ('960', 1440, 81),
                                    ('full', 1920, 84)]:
            derivative = photo.copy()
            if name in ('480', '960'):
                width = int(name)
                size = (width, max(1, round(photo.height * width / photo.width)))
            else:
                size = (edge, edge)
            derivative.thumbnail(size, Image.Resampling.LANCZOS)
            filename = f'photo-{original.stem.lower()}-{name}.webp'
            path = output / filename
            derivative.save(path, 'WEBP', quality=quality, method=6)
            entry['variants'][name] = {'src': 'images/' + filename,
                'width': derivative.width, 'height': derivative.height,
                'bytes': path.stat().st_size}
        return entry

with ThreadPoolExecutor(max_workers=4) as workers:
    manifest = list(workers.map(prepare, sorted(args.source.glob('AUT*.JPG'))))
(output / 'photo-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'photos': len(manifest),
    'retouched': sum(p['retouched'] for p in manifest),
    'webp_bytes': sum(v['bytes'] for p in manifest for v in p['variants'].values())}))
