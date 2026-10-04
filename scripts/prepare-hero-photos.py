"""Encode dedicated high-quality responsive WebP for the opening and closing.

Opening uses the approved retouch, resized for high-DPI presentation. This does
not claim to restore native camera detail. Closing uses the full-size original.
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageOps

parser=argparse.ArgumentParser()
parser.add_argument('--opening',type=Path,required=True)
parser.add_argument('--closing',type=Path,required=True)
args=parser.parse_args()
out=Path(__file__).resolve().parents[1]/'dist/images'

def prepare(item):
    name,path=item
    with Image.open(path) as im:
        photo=ImageOps.exif_transpose(im).convert('RGB')
        record={'id':name,'source_width':photo.width,'source_height':photo.height,
            'retouched':name=='aut01161','variants':[]}
        for width in [960,1440,2048,3072]:
            size=(width,round(width*photo.height/photo.width))
            image=photo.resize(size,Image.Resampling.LANCZOS)
            filename=f'hero-{name}-{width}.webp'
            target=out/filename
            image.save(target,'WEBP',quality=90,method=6)
            record['variants'].append({'src':'images/'+filename,'width':image.width,
                'height':image.height,'bytes':target.stat().st_size,
                'upsampled':width>photo.width})
        return record

with ThreadPoolExecutor(max_workers=2) as workers:
    records=list(workers.map(prepare,[('aut01161',args.opening),('aut01628',args.closing)]))
(out/'hero-manifest.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records,indent=2))
