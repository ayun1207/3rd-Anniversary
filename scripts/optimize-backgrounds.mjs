import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'images/backgrounds');
await mkdir(output, { recursive: true });

for (const id of [32, 33, 34]) {
    const input = resolve(root, `artwork-originals/${id}.png`);
    const { width, height } = await sharp(input).metadata();
    for (const size of [1280, 2400]) {
        const destination = resolve(output, `${id}-${size}.webp`);
        await sharp(input).rotate().resize({ width: size, withoutEnlargement: true })
            .webp({ quality: 82, effort: 6 }).toFile(destination);
        const { size: bytes } = await stat(destination);
        console.log(`${id}: ${width} × ${height} → ${size}px, ${Math.round(bytes / 1024)} KB`);
    }
}

// 封面拼圖保留 alpha，以透明素材融合底色。
for (const width of [900, 1800]) {
    const destination = resolve(output, `35-${width}.webp`);
    const result = await sharp(resolve(root, 'artwork-originals/35.png')).rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 86, alphaQuality: 95, effort: 6 }).toFile(destination);
    console.log(`35: ${result.width} × ${result.height}, ${Math.round(result.size / 1024)} KB`);
}
