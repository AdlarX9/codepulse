// Liste complète des langages supportés par CodePulse
// Synchronisée avec language.rs
export const ALL_LANGUAGES = [
	// Web
	'JavaScript',
	'TypeScript',
	'HTML',
	'CSS',
	'SCSS',
	'Sass',
	'Less',
	'Vue',
	'Svelte',
	
	// Backend
	'Python',
	'Ruby',
	'PHP',
	'Java',
	'Kotlin',
	'Scala',
	'Go',
	'Rust',
	'C',
	'C++',
	'C#',
	'Swift',
	'Objective-C',
	'Objective-C++',
	
	// Functional
	'Haskell',
	'Elm',
	'Elixir',
	'Erlang',
	'OCaml',
	'F#',
	'Clojure',
	
	// Shell
	'Shell',
	'Bash',
	'Zsh',
	'Fish',
	'PowerShell',
	
	// Data & Config
	'JSON',
	'YAML',
	'TOML',
	'XML',
	'SQL',
	'GraphQL',
	
	// Markup
	'Markdown',
	'MDX',
	'LaTeX',
	'reStructuredText',
	
	// Other
	'Lua',
	'R',
	'Julia',
	'Dart',
	'Vimscript',
	'Docker',
	'Make',
	'CMake',
].sort()

export const COMMON_EXCLUDED_LANGUAGES = [
	'Markdown',
	'JSON',
	'YAML',
	'TOML',
	'XML',
	'HTML',
	'CSS',
]
