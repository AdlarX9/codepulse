/**
 * Language detection mapping
 */

export const LANGUAGE_MAP: Record<string, string> = {
	// Web
	js: 'JavaScript',
	jsx: 'JavaScript',
	ts: 'TypeScript',
	tsx: 'TypeScript',
	html: 'HTML',
	htm: 'HTML',
	css: 'CSS',
	scss: 'SCSS',
	sass: 'Sass',
	less: 'Less',
	vue: 'Vue',
	svelte: 'Svelte',

	// Backend
	py: 'Python',
	rb: 'Ruby',
	php: 'PHP',
	java: 'Java',
	kt: 'Kotlin',
	scala: 'Scala',
	go: 'Go',
	rs: 'Rust',
	c: 'C',
	h: 'C',
	cpp: 'C++',
	cc: 'C++',
	cxx: 'C++',
	hpp: 'C++',
	cs: 'C#',
	swift: 'Swift',
	m: 'Objective-C',
	mm: 'Objective-C++',

	// Functional
	hs: 'Haskell',
	elm: 'Elm',
	ex: 'Elixir',
	exs: 'Elixir',
	erl: 'Erlang',
	ml: 'OCaml',
	fs: 'F#',
	clj: 'Clojure',

	// Shell
	sh: 'Shell',
	bash: 'Bash',
	zsh: 'Zsh',
	fish: 'Fish',
	ps1: 'PowerShell',

	// Data & Config
	json: 'JSON',
	yaml: 'YAML',
	yml: 'YAML',
	toml: 'TOML',
	xml: 'XML',
	sql: 'SQL',
	graphql: 'GraphQL',
	gql: 'GraphQL',

	// Markup & Docs
	md: 'Markdown',
	mdx: 'MDX',
	tex: 'LaTeX',
	rst: 'reStructuredText',

	// Other
	lua: 'Lua',
	r: 'R',
	jl: 'Julia',
	dart: 'Dart',
	vim: 'Vimscript'
}

export const SPECIAL_FILENAMES: Record<string, string> = {
	Dockerfile: 'Docker',
	Makefile: 'Make',
	Rakefile: 'Ruby',
	Gemfile: 'Ruby',
	Podfile: 'Ruby',
	'CMakeLists.txt': 'CMake',
	'docker-compose.yml': 'Docker',
	'docker-compose.yaml': 'Docker'
}

export function detectLanguage(filename: string): string {
	// Check special filenames first
	if (SPECIAL_FILENAMES[filename]) {
		return SPECIAL_FILENAMES[filename]
	}

	// Extract extension
	const parts = filename.split('.')
	if (parts.length < 2) return 'Unknown'

	const ext = parts[parts.length - 1].toLowerCase()
	return LANGUAGE_MAP[ext] || 'Unknown'
}
