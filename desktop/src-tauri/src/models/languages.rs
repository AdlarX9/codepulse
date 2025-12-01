use std::collections::HashMap;

// Language category mapping: "core" vs "info"
// This mirrors the TypeScript version in packages/core

lazy_static::lazy_static! {
	static ref LANGUAGE_CATEGORIES: HashMap<&'static str, &'static str> = {
		let mut m = HashMap::new();

		// Core programming languages
		m.insert("TypeScript", "core");
		m.insert("JavaScript", "core");
		m.insert("Rust", "core");
		m.insert("Go", "core");
		m.insert("Python", "core");
		m.insert("Ruby", "core");
		m.insert("PHP", "core");
		m.insert("Java", "core");
		m.insert("Kotlin", "core");
		m.insert("Scala", "core");
		m.insert("C", "core");
		m.insert("C++", "core");
		m.insert("C#", "core");
		m.insert("Swift", "core");
		m.insert("Objective-C", "core");
		m.insert("Objective-C++", "core");
		m.insert("Haskell", "core");
		m.insert("Elm", "core");
		m.insert("Elixir", "core");
		m.insert("Erlang", "core");
		m.insert("OCaml", "core");
		m.insert("F#", "core");
		m.insert("Clojure", "core");
		m.insert("Lua", "core");
		m.insert("R", "core");
		m.insert("Julia", "core");
		m.insert("Dart", "core");

		// Shell scripts
		m.insert("Shell", "core");
		m.insert("Bash", "core");
		m.insert("Zsh", "core");
		m.insert("Fish", "core");
		m.insert("PowerShell", "core");

		// SQL and query languages
		m.insert("SQL", "core");
		m.insert("GraphQL", "core");

		// Component frameworks (with logic)
		m.insert("Vue", "core");
		m.insert("Svelte", "core");
		m.insert("Vimscript", "core");

		// Markup and documentation
		m.insert("Markdown", "info");
		m.insert("MDX", "info");
		m.insert("HTML", "info");
		m.insert("LaTeX", "info");
		m.insert("reStructuredText", "info");

		// Stylesheets
		m.insert("CSS", "info");
		m.insert("SCSS", "info");
		m.insert("Sass", "info");
		m.insert("Less", "info");

		// Config and data formats
		m.insert("JSON", "info");
		m.insert("YAML", "info");
		m.insert("TOML", "info");
		m.insert("XML", "info");

		// Build/tooling
		m.insert("Docker", "info");
		m.insert("Make", "info");
		m.insert("CMake", "info");

		// Default for unknown
		m.insert("Unknown", "info");

		m
	};

	// Extension -> Language mapping (unified)
	static ref LANGUAGE_MAP: HashMap<&'static str, &'static str> = {
		let mut m = HashMap::new();
		// Web
		m.insert("js", "JavaScript");
		m.insert("jsx", "JavaScript");
		m.insert("ts", "TypeScript");
		m.insert("tsx", "TypeScript");
		m.insert("html", "HTML");
		m.insert("htm", "HTML");
		m.insert("css", "CSS");
		m.insert("scss", "SCSS");
		m.insert("sass", "Sass");
		m.insert("less", "Less");
		m.insert("vue", "Vue");
		m.insert("svelte", "Svelte");

		// Backend
		m.insert("py", "Python");
		m.insert("rb", "Ruby");
		m.insert("php", "PHP");
		m.insert("java", "Java");
		m.insert("kt", "Kotlin");
		m.insert("kts", "Kotlin");
		m.insert("scala", "Scala");
		m.insert("go", "Go");
		m.insert("rs", "Rust");
		m.insert("c", "C");
		m.insert("h", "C");
		m.insert("cpp", "C++");
		m.insert("cc", "C++");
		m.insert("cxx", "C++");
		m.insert("hpp", "C++");
		m.insert("hh", "C++");
		m.insert("hxx", "C++");
		m.insert("cs", "C#");
		m.insert("swift", "Swift");
		m.insert("m", "Objective-C");
		m.insert("mm", "Objective-C++");

		// Functional
		m.insert("hs", "Haskell");
		m.insert("elm", "Elm");
		m.insert("ex", "Elixir");
		m.insert("exs", "Elixir");
		m.insert("erl", "Erlang");
		m.insert("ml", "OCaml");
		m.insert("fs", "F#");
		m.insert("clj", "Clojure");

		// Shell
		m.insert("sh", "Shell");
		m.insert("bash", "Bash");
		m.insert("zsh", "Zsh");
		m.insert("fish", "Fish");
		m.insert("ps1", "PowerShell");

		// Data & Config
		m.insert("json", "JSON");
		m.insert("yaml", "YAML");
		m.insert("yml", "YAML");
		m.insert("toml", "TOML");
		m.insert("xml", "XML");
		m.insert("sql", "SQL");
		m.insert("graphql", "GraphQL");
		m.insert("gql", "GraphQL");

		// Markup
		m.insert("md", "Markdown");
		m.insert("mdx", "MDX");
		m.insert("tex", "LaTeX");
		m.insert("rst", "reStructuredText");

		// Other
		m.insert("lua", "Lua");
		m.insert("r", "R");
		m.insert("jl", "Julia");
		m.insert("dart", "Dart");
		m.insert("vim", "Vimscript");

		m
	};

	// Special filename -> Language mapping
	static ref SPECIAL_FILES: HashMap<&'static str, &'static str> = {
		let mut m = HashMap::new();
		m.insert("Dockerfile", "Docker");
		m.insert("Makefile", "Make");
		m.insert("Rakefile", "Ruby");
		m.insert("Gemfile", "Ruby");
		m.insert("Podfile", "Ruby");
		m.insert("CMakeLists.txt", "CMake");
		m
	};
}

pub fn get_common_excluded_languages() -> Vec<String> {
	vec![
		"JSON",
		"YAML",
		"XML",
		"SQL",
		"GraphQL",
		"TOML",
		"Markdown",
		"MDX",
		"LaTeX",
		"reStructuredText",
	]
	.into_iter()
	.map(|s| s.to_string())
	.collect()
}

pub fn detect_language(filename: &str) -> String {
	if let Some(&lang) = SPECIAL_FILES.get(filename) {
		return lang.to_string();
	}
	if let Some(ext_pos) = filename.rfind('.') {
		let ext = &filename[ext_pos + 1..].to_lowercase();
		if let Some(&lang) = LANGUAGE_MAP.get(ext.as_str()) {
			return lang.to_string();
		}
	}
	"Unknown".to_string()
}

pub fn get_supported_languages() -> Vec<String> {
	let mut set: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
	for &lang in LANGUAGE_MAP.values() {
		set.insert(lang.to_string());
	}
	for &lang in SPECIAL_FILES.values() {
		set.insert(lang.to_string());
	}
	set.into_iter().collect()
}
