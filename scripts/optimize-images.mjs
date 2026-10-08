import { mkdir, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, parse, resolve } from 'node:path'
import sharp from 'sharp'

const projectRoot = resolve(import.meta.dirname, '..')
const originalsDirectory = join(projectRoot, 'artwork-originals')
const artworkOutputDirectory = join(projectRoot, 'images', 'artworks')
const supportedExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp'])

async function writeWebp(input, output, { maxWidth, quality }) {
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
    .webp({ quality, alphaQuality: 95, effort: 6, smartSubsample: true })
    .toFile(output)
}

await writeWebp(
  join(projectRoot, 'images', 'intro-atmosphere-v2.png'),
  join(projectRoot, 'images', 'intro-atmosphere-v2.webp'),
  { maxWidth: 1920, quality: 88 }
)

const artworkSourceDirectory = existsSync(originalsDirectory)
  ? originalsDirectory
  : join(projectRoot, 'images')
const sourceEntries = await readdir(artworkSourceDirectory, { withFileTypes: true })
const artworkSources = new Map()

for (const entry of sourceEntries) {
  if (!entry.isFile() || !supportedExtensions.has(extname(entry.name).toLowerCase())) continue
  const stem = parse(entry.name).name
  const match = stem.match(/^(?:photo)?(\d{1,2})(?:\D|$)/i)
  if (!match) continue

  const id = Number(match[1])
  if (id < 1 || id > 24) continue
  if (artworkSources.has(id)) throw new Error(`Duplicate artwork id ${id} in ${artworkSourceDirectory}`)
  artworkSources.set(id, join(artworkSourceDirectory, entry.name))
}

await Promise.all(Array.from(artworkSources, async ([id, input]) => {
  const number = String(id).padStart(2, '0')
  await Promise.all([
    writeWebp(input, join(artworkOutputDirectory, `${number}.webp`), {
      maxWidth: 2000,
      quality: 84
    }),
    writeWebp(input, join(artworkOutputDirectory, `${number}-960.webp`), {
      maxWidth: 960,
      quality: 80
    })
  ])
}))

console.log(`Optimized ${artworkSources.size} artwork image(s) from ${artworkSourceDirectory}.`)
for (const id of artworkSources.keys()) {
  const number = String(id).padStart(2, '0')
  const full = await stat(join(artworkOutputDirectory, `${number}.webp`))
  const compact = await stat(join(artworkOutputDirectory, `${number}-960.webp`))
  console.log(`${number}: ${Math.round(full.size / 1024)} KB / ${Math.round(compact.size / 1024)} KB`)
}
