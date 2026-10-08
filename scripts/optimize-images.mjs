import { mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, parse, resolve } from 'node:path'
import sharp from 'sharp'

const projectRoot = resolve(import.meta.dirname, '..')
const originalsDirectory = join(projectRoot, 'artwork-originals')
const artworkOutputDirectory = join(projectRoot, 'images', 'artworks')
const supportedExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp'])

async function writeWebp(input, output, maxWidth) {
  await mkdir(parse(output).dir, { recursive: true })

  const pipeline = sharp(input).rotate()
  if (maxWidth) {
    pipeline.resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: 'inside'
    })
  }

  await pipeline
    .webp({ quality: 88, alphaQuality: 95, effort: 6, smartSubsample: true })
    .toFile(output)
}

await writeWebp(
  join(projectRoot, 'images', 'intro-atmosphere-v2.png'),
  join(projectRoot, 'images', 'intro-atmosphere-v2.webp'),
  1920
)

if (existsSync(originalsDirectory)) {
  const originals = await readdir(originalsDirectory, { withFileTypes: true })
  const imageFiles = originals.filter(entry => (
    entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase())
  ))

  await Promise.all(imageFiles.map(entry => {
    const outputName = `${parse(entry.name).name}.webp`
    return writeWebp(
      join(originalsDirectory, entry.name),
      join(artworkOutputDirectory, outputName),
      2400
    )
  }))

  console.log(`Optimized ${imageFiles.length} artwork image(s) from artwork-originals/.`)
} else {
  console.log('No artwork-originals/ directory found; optimized the intro background only.')
}
