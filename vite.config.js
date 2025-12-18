import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Read package.json for build-time constants
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    '__VERSION__': JSON.stringify(pkg.version),
    '__PACKAGE_NAME__': JSON.stringify(pkg.name),
    '__AUTHOR__': JSON.stringify(pkg.author || ''),
    '__LICENSE__': JSON.stringify(pkg.license || 'MIT'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'WebGrid',
      formats: ['es', 'umd'],
      fileName: (format) => `web-grid.${format === 'es' ? 'js' : 'umd.js'}`
    },
    rollupOptions: {
      // No external dependencies - everything bundled
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    port: 12500
  }
})
