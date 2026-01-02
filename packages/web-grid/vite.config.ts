import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Read package.json for build-time constants
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
	define: {
		'__VERSION__': JSON.stringify(pkg.version),
		'__PACKAGE_NAME__': JSON.stringify(pkg.name),
		'__AUTHOR__': JSON.stringify(pkg.author),
		'__LICENSE__': JSON.stringify(pkg.license),
		'__REPOSITORY__': JSON.stringify(pkg.repository.url),
		'__HOMEPAGE__': JSON.stringify(pkg.homepage)
	},
	build: {
		// Don't clean dist folder - preserve TypeScript declarations from tsc
		emptyOutDir: false,
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'WebGrid',
			formats: ['es', 'umd'],
			fileName: (format) => `web-grid.${format === 'es' ? 'js' : 'umd.js'}`
		},
		rollupOptions: {
			external: [],
			output: {
				globals: {}
			}
		}
	}
});
