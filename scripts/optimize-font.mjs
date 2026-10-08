import subsetFont from 'subset-font'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const sourceFont = resolve('fonts/lxgw-wenkai-tc-300.woff2')
const outputFont = resolve('fonts/lxgw-wenkai-tc-300-subset.woff2')
const sourceFiles = [resolve('index.html'), resolve('script.js')]
const includedExtensions = new Set(['.js', '.json', '.vue'])

async function collectSourceFiles(directory) {
  const entries = await readdir(directory)
  for (const entry of entries) {
    const absolutePath = join(directory, entry)
    const details = await stat(absolutePath)
    if (details.isDirectory()) await collectSourceFiles(absolutePath)
    else if (includedExtensions.has(extname(entry))) sourceFiles.push(absolutePath)
  }
}

await collectSourceFiles(resolve('src'))

const sourceText = await Promise.all(sourceFiles.map(file => readFile(file, 'utf8')))
const characters = [...new Set(sourceText.join('\n'))].join('')
const font = await readFile(sourceFont)
const subset = await subsetFont(font, characters, { targetFormat: 'woff2' })
await writeFile(outputFont, subset)

const kilobytes = Math.round(subset.length / 1024)
console.log(`字型子集已更新：${characters.length} 個字元，${kilobytes} KB`)
