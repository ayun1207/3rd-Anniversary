import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'

function copyStaticDirectories() {
  const directoryMappings = [
    ['audio', 'audio'],
    ['images/artworks', 'images/artworks'],
  ]

  return {
    name: 'copy-static-directories',
    apply: 'build',
    buildStart() {
      const emitDirectory = (sourceRoot, outputRoot, currentDirectory = sourceRoot) => {
        readdirSync(currentDirectory).forEach(name => {
          const absolutePath = resolve(currentDirectory, name)
          if (statSync(absolutePath).isDirectory()) {
            emitDirectory(sourceRoot, outputRoot, absolutePath)
            return
          }

          const relativePath = relative(sourceRoot, absolutePath).replaceAll('\\', '/')
          this.emitFile({
            type: 'asset',
            fileName: `${outputRoot}/${relativePath}`,
            source: readFileSync(absolutePath)
          })
        })
      }

      directoryMappings.forEach(([sourceDirectory, outputDirectory]) => {
        const source = resolve(sourceDirectory)
        if (existsSync(source)) emitDirectory(source, outputDirectory)
      })
    }
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  publicDir: false,
  plugins: [vue(), copyStaticDirectories()],
  server: {
    open: false
  }
})
