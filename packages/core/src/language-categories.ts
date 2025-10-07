/**
 * Language category mapping for CodePulse.
 * Distinguishes "core code" (actual programming languages) from "info" (docs, config, markup).
 * Used for analytics and segmentation: "True Code" vs "Info".
 */

export type LanguageCategory = 'core' | 'info'

export const LANGUAGE_CATEGORY: Record<string, LanguageCategory> = {
	// Core programming languages
	TypeScript: 'core',
	JavaScript: 'core',
	Rust: 'core',
	Go: 'core',
	Python: 'core',
	Ruby: 'core',
	PHP: 'core',
	Java: 'core',
	Kotlin: 'core',
	Scala: 'core',
	C: 'core',
	'C++': 'core',
	'C#': 'core',
	Swift: 'core',
	'Objective-C': 'core',
	'Objective-C++': 'core',
	Haskell: 'core',
	Elm: 'core',
	Elixir: 'core',
	Erlang: 'core',
	OCaml: 'core',
	'F#': 'core',
	Clojure: 'core',
	Lua: 'core',
	R: 'core',
	Julia: 'core',
	Dart: 'core',

	// Shell scripts
	Shell: 'core',
	Bash: 'core',
	Zsh: 'core',
	Fish: 'core',
	PowerShell: 'core',

	// SQL and query languages
	SQL: 'core',
	GraphQL: 'core',

	// Markup and documentation
	Markdown: 'info',
	MDX: 'info',
	HTML: 'info',
	LaTeX: 'info',
	reStructuredText: 'info',

	// Stylesheets (debatable, but often config-like)
	CSS: 'info',
	SCSS: 'info',
	Sass: 'info',
	Less: 'info',

	// Component frameworks (debatable; some might be 'core')
	Vue: 'core', // Has logic
	Svelte: 'core', // Has logic

	// Config and data formats
	JSON: 'info',
	YAML: 'info',
	TOML: 'info',
	XML: 'info',

	// Build/tooling
	Docker: 'info',
	Make: 'info',
	CMake: 'info',
	Vimscript: 'core', // Scripting language

	// Unknown
	Unknown: 'info'
}

/**
 * Get category for a language, defaulting to 'info' if not found.
 */
export function getLanguageCategory(language: string): LanguageCategory {
	return LANGUAGE_CATEGORY[language] ?? 'info'
}

/**
 * Aggregate total lines by category from per-language stats.
 * @param perLanguage Array of { language, total, ... }
 * @returns { core: number, info: number }
 */
export function aggregateByCategory(perLanguage: Array<{ language: string; total: number }>): {
	core: number
	info: number
} {
	let core = 0
	let info = 0
	for (const item of perLanguage) {
		const cat = getLanguageCategory(item.language)
		if (cat === 'core') {
			core += item.total
		} else {
			info += item.total
		}
	}
	return { core, info }
}
