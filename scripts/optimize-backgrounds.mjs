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
