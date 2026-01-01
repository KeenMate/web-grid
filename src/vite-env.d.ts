/// <reference types="vite/client" />

// CSS module imports (Vite ?inline)
declare module '*.css?inline' {
	const content: string
	export default content
}

declare module '*.css' {
	const content: string
	export default content
}
