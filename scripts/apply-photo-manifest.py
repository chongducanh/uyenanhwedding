"""Refresh image URLs and intrinsic dimensions after rebuilding WebP assets."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
photos = {p['id']: p for p in json.loads((root/'dist/images/photo-manifest.json').read_text())}
page = root/'dist/index.html'

def attribute(tag, name, value):
    pattern = rf'\s{re.escape(name)}="[^"]*"'
    replacement = f' {name}="{value}"'
    return re.sub(pattern, replacement, tag) if re.search(pattern, tag) else tag[:-1] + replacement + '>'

def update(match):
    tag = match.group(0)
    photo = photos[re.search(r'data-photo="([^"]+)"', tag)[1]]
    name = re.search(r'data-variant="([^"]+)"', tag)[1]
    variants = photo['variants']
    variant = variants[name]
    for key in ['src', 'width', 'height']:
        tag = attribute(tag, key, variant[key])
    if 'data-responsive=' in tag:
        sources = {variants[key]['width']: variants[key]['src'] for key in ['480', '960', 'full']}
        tag = attribute(tag, 'srcset', ', '.join(f'{src} {width}w' for width, src in sorted(sources.items())))
    if 'data-full=' in tag:
        tag = attribute(tag, 'data-full', variants['full']['src'])
        tag = attribute(tag, 'data-thumb', variants['thumb']['src'])
    return tag

page.write_text(re.sub(r'<img\b[^>]*\bdata-photo="[^"]+"[^>]*>', update, page.read_text()))
print('Updated responsive image sources and intrinsic dimensions.')
