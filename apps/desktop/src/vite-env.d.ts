/// <reference types="vite/client" />

// CSS module declarations
declare module '*.css' {
	const classes: { readonly [key: string]: string }
	export default classes
}

declare module '*.scss' {
	const classes: { readonly [key: string]: string }
	export default classes
}

declare module '*.sass' {
	const classes: { readonly [key: string]: string }
	export default classes
}

// Asset declarations
declare module '*.png' {
	const src: string
	export default src
}

declare module '*.jpg' {
	const src: string
	export default src
}

declare module '*.jpeg' {
	const src: string
	export default src
}

declare module '*.gif' {
	const src: string
	export default src
}

declare module '*.svg' {
	const src: string
	export default src
}

declare module '*.webp' {
	const src: string
	export default src
}

// Console overlay globals
interface Window {
	__consoleOverlay?: {
		toggle(enabled: boolean): void
	}
}

interface ImportMetaEnv {
	readonly VITE_CONSOLE_OVERLAY?: string
}
