import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Read library package.json for build-time constants
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../packages/web-grid/package.json'), 'utf-8'));

export default defineConfig({
	define: {
		'__VERSION__': JSON.stringify(pkg.version),
		'__PACKAGE_NAME__': JSON.stringify(pkg.name),
		'__AUTHOR__': JSON.stringify(pkg.author || ''),
		'__LICENSE__': JSON.stringify(pkg.license || ''),
		'__REPOSITORY__': JSON.stringify(pkg.repository?.url || ''),
		'__HOMEPAGE__': JSON.stringify(pkg.homepage || '')
	},
	server: {
		port: 12400
	},
	resolve: {
		alias: {
			// Point to source for HMR during development
			'@keenmate/web-grid': resolve(__dirname, '../packages/web-grid/src/index.ts'),
			'@keenmate/web-grid/css': resolve(__dirname, '../packages/web-grid/src/css/main.css')
		}
	},
	build: {
		outDir: 'build',
		emptyOutDir: true
	}
});
