import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
