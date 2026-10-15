"""Generate WebP display assets without changing the original photos.

Run with Python 3 and Pillow after changing any of the listed originals.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
output = root / 'web/public/photos/optimized'
output.mkdir(parents=True, exist_ok=True)
sources = {
    'hero-collage.jpg': 1600,
    'idol-logo.png': 192,
    'banner-studio-brand-1.jpg': 1600,
    'banner-studio-brand-2.jpg': 1600,
    'member-light-sign-v8.png': 1600,
    'xhs-studio.jpg': 720,
    'xhs-character-wall.jpg': 720,
    'xhs-display-wall.jpg': 720,
    'show_27.jpg': 960,
    'show_28.jpg': 960,
    'show_29.jpg': 960,
}
manifest = {}
for name, max_size in sources.items():
    source = root / 'web/public/photos' / name
    if not source.exists():
        source = root / 'public/photos' / name
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        target = output / f'{source.stem}.webp'
        image.save(target, 'WEBP', quality=82, method=6)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()[:12]
    versioned = output / f'{source.stem}-{digest}.webp'
    target.replace(versioned)
    manifest[f'/photos/{name}'] = f'/photos/optimized/{versioned.name}'
    print(f'{name}: {source.stat().st_size:,} -> {versioned.stat().st_size:,} bytes')

(root / 'web/src/optimized-images.json').write_text(
    json.dumps(manifest, indent=2) + '\n'
)
