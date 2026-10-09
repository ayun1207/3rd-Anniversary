import { access, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { seasonsData } from '../src/data/seasons.js'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const strict = process.argv.includes('--strict')
const errors = []
const warnings = []

const html = await readFile(resolve(projectRoot, 'index.html'), 'utf8')
const script = await readFile(resolve(projectRoot, 'script.js'), 'utf8')

const solarTermNames = Array.from(
  html.matchAll(/class="solar-term[^>]*>\s*([^<]+?)\s*<\/span>/g),
  match => match[1].trim()
)
const slideNames = Array.from(
  html.matchAll(/<figure class="slide-item[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<\/figure>/g),
  match => match[1].trim()
)
const colorBlock = script.match(/const backgroundColors = \[([\s\S]*?)\];/)
const colorCount = colorBlock?.[1].match(/#[0-9a-f]{6}/gi)?.length ?? 0

function expect(condition, message) {
  if (!condition) errors.push(message)
}

expect(seasonsData.length === 24, `seasonsData 應有 24 筆，目前為 ${seasonsData.length} 筆。`)
expect(solarTermNames.length === 24, `index.html 應有 24 個節氣刻度，目前為 ${solarTermNames.length} 個。`)
expect(slideNames.length === 24, `index.html 應有 24 件作品，目前為 ${slideNames.length} 件。`)
expect(colorCount === 24, `backgroundColors 應有 24 筆，目前為 ${colorCount} 筆。`)

const ids = seasonsData.map(item => item.id)
expect(new Set(ids).size === seasonsData.length, 'seasonsData 內有重複 id。')
expect(ids.every((id, index) => id === index + 1), 'seasonsData 的 id 必須依序為 1–24。')

const dataNames = seasonsData.map(item => item.name)
if (solarTermNames.length === 24) {
  expect(dataNames.every((name, index) => name === solarTermNames[index]), '節氣環順序與 seasonsData 不一致。')
}
if (slideNames.length === 24) {
  expect(dataNames.every((name, index) => name === slideNames[index]), '作品標題順序與 seasonsData 不一致。')
}

const missingImages = []
const largeImages = []
for (const season of seasonsData) {
  const relativeImagePath = season.image.replace(/^\/?/, '')
  const imagePath = resolve(projectRoot, relativeImagePath)
  try {
    await access(imagePath)
    const imageStat = await stat(imagePath)
    if (imageStat.size > 700_000) {
      largeImages.push(`${season.number} ${season.name} (${Math.round(imageStat.size / 1024)} KB)`)
    }
  } catch {
    missingImages.push(`${season.number} ${season.name}: ${relativeImagePath}`)
  }
}

if (missingImages.length) warnings.push(`缺少 ${missingImages.length} 張作品圖片：\n  ${missingImages.join('\n  ')}`)
if (largeImages.length) warnings.push(`有 ${largeImages.length} 張網站圖片超過 700 KB：\n  ${largeImages.join('\n  ')}`)

const placeholderStories = seasonsData.filter(item => item.story.includes('在這裡寫下'))
const placeholderAlts = seasonsData.filter(item => /^圖片\s*\d+$/.test(item.alt))
if (placeholderStories.length) warnings.push(`${placeholderStories.length} 筆作品敘述仍是 placeholder。`)
if (placeholderAlts.length) warnings.push(`${placeholderAlts.length} 筆圖片 alt 仍是 placeholder。`)
if (/<title>展示網站<\/title>/.test(html)) warnings.push('網站 <title> 仍是「展示網站」。')
if (/placeholder|>文字<|>署名</.test(html)) warnings.push('index.html 仍含 placeholder、文字或署名等待替換內容。')

for (const error of errors) console.error(`ERROR: ${error}`)
for (const warning of warnings) console.warn(`WARN: ${warning}`)

if (!errors.length && !warnings.length) {
  console.log('Content validation passed with no warnings.')
} else {
  console.log(`Validation finished: ${errors.length} error(s), ${warnings.length} warning(s).`)
}

if (errors.length || (strict && warnings.length)) process.exitCode = 1
