use lazy_static::lazy_static;
use serde::Serialize;
use std::collections::{BTreeSet, HashMap};

pub struct Languages;

// Centralized per-language definitions. Each language entry lists its
// canonical name, extensions, special filenames, category (core|info),
// line comment markers and optional block comment markers.
#[derive(Debug, Serialize, Clone, PartialEq, Eq, Hash)]
pub struct LanguageDef {
	name: &'static str,
	extensions: &'static [&'static str],
	filenames: &'static [&'static str],
	category: &'static str,
	line_markers: &'static [&'static str],
	block_markers: Option<(&'static str, &'static str)>,
}

pub const LANGUAGE_DEFINITIONS: &[LanguageDef] = &[
	LanguageDef {
		name: "JavaScript",
		extensions: &["js", "jsx"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "TypeScript",
		extensions: &["ts", "tsx"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "HTML",
		extensions: &["html", "htm"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: Some(("<!--", "-->")),
	},
	LanguageDef {
		name: "CSS",
		extensions: &["css"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "SCSS",
		extensions: &["scss"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Sass",
		extensions: &["sass"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Less",
		extensions: &["less"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Vue",
		extensions: &["vue"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Svelte",
		extensions: &["svelte"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Python",
		extensions: &["py"],
		filenames: &[],
		category: "core",
		line_markers: &["#"],
		block_markers: Some(("\"\"\"", "\"\"\"")),
	},
	LanguageDef {
		name: "Ruby",
		extensions: &["rb"],
		filenames: &["Gemfile", "Rakefile"],
		category: "core",
		line_markers: &["#"],
		block_markers: None,
	},
	LanguageDef {
		name: "PHP",
		extensions: &["php"],
		filenames: &[],
		category: "core",
		line_markers: &["//", "#"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Java",
		extensions: &["java"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Kotlin",
		extensions: &["kt", "kts"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Scala",
		extensions: &["scala"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: None,
	},
	LanguageDef {
		name: "Rust",
		extensions: &["rs"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Go",
		extensions: &["go"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "C",
		extensions: &["c", "h"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "C++",
		extensions: &["cpp", "cc", "cxx", "hpp", "hh", "hxx"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "C#",
		extensions: &["cs"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Objective-C",
		extensions: &["m"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Objective-C++",
		extensions: &["mm"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Swift",
		extensions: &["swift"],
		filenames: &[],
		category: "core",
		line_markers: &["//"],
		block_markers: Some(("/*", "*/")),
	},
	LanguageDef {
		name: "Haskell",
		extensions: &["hs"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Elm",
		extensions: &["elm"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Elixir",
		extensions: &["ex", "exs"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Erlang",
		extensions: &["erl"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "OCaml",
		extensions: &["ml"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "F#",
		extensions: &["fs"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Clojure",
		extensions: &["clj"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Lua",
		extensions: &["lua"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "R",
		extensions: &["r"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Julia",
		extensions: &["jl"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Dart",
		extensions: &["dart"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Shell",
		extensions: &["sh"],
		filenames: &[],
		category: "core",
		line_markers: &["#"],
		block_markers: None,
	},
	LanguageDef {
		name: "Bash",
		extensions: &["bash"],
		filenames: &[],
		category: "core",
		line_markers: &["#"],
		block_markers: None,
	},
	LanguageDef {
		name: "Zsh",
		extensions: &["zsh"],
		filenames: &[],
		category: "core",
		line_markers: &["#"],
		block_markers: None,
	},
	LanguageDef {
		name: "Fish",
		extensions: &["fish"],
		filenames: &[],
		category: "core",
		line_markers: &["#"],
		block_markers: None,
	},
	LanguageDef {
		name: "PowerShell",
		extensions: &["ps1"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "SQL",
		extensions: &["sql"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "GraphQL",
		extensions: &["graphql", "gql"],
		filenames: &[],
		category: "core",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Markdown",
		extensions: &["md"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "MDX",
		extensions: &["mdx"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "LaTeX",
		extensions: &["tex"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "reStructuredText",
		extensions: &["rst"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "JSON",
		extensions: &["json"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "YAML",
		extensions: &["yaml", "yml"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "TOML",
		extensions: &["toml"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "XML",
		extensions: &["xml"],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: Some(("<!--", "-->")),
	},
	LanguageDef {
		name: "Docker",
		extensions: &[],
		filenames: &["Dockerfile"],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Make",
		extensions: &[],
		filenames: &["Makefile"],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "CMake",
		extensions: &[],
		filenames: &["CMakeLists.txt"],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
	LanguageDef {
		name: "Unknown",
		extensions: &[],
		filenames: &[],
		category: "info",
		line_markers: &[],
		block_markers: None,
	},
];

lazy_static! {
	static ref LANGUAGES: Languages = Languages;
	static ref LANGUAGE_CATEGORIES: HashMap<&'static str, &'static str> = {
		let mut m = HashMap::new();
		for def in LANGUAGE_DEFINITIONS.iter() {
			m.insert(def.name, def.category);
		}
		m
	};
	static ref LANGUAGE_MAP: HashMap<&'static str, &'static str> = {
		let mut m = HashMap::new();
		for def in LANGUAGE_DEFINITIONS.iter() {
			for &ext in def.extensions.iter() {
				m.insert(ext, def.name);
			}
		}
		m
	};
	static ref SPECIAL_FILES: HashMap<&'static str, &'static str> = {
		let mut m = HashMap::new();
		for def in LANGUAGE_DEFINITIONS.iter() {
			for &fname in def.filenames.iter() {
				m.insert(fname, def.name);
			}
		}
		m
	};
	static ref LINE_COMMENT_MARKERS: HashMap<&'static str, Vec<&'static str>> = {
		let mut m = HashMap::new();
		for def in LANGUAGE_DEFINITIONS.iter() {
			if !def.line_markers.is_empty() {
				m.insert(def.name, def.line_markers.to_vec());
			}
		}
		m
	};
	static ref BLOCK_COMMENT_MARKERS: HashMap<&'static str, (&'static str, &'static str)> = {
		let mut m = HashMap::new();
		for def in LANGUAGE_DEFINITIONS.iter() {
			if let Some(pair) = def.block_markers {
				m.insert(def.name, pair);
			}
		}
		m
	};
}

pub fn languages() -> &'static Languages {
	&LANGUAGES
}

impl Languages {
	pub fn ext_to_language(&self, ext: &str) -> &str {
		if let Some(lang) = LANGUAGE_MAP.get(ext) {
			lang
		} else {
			"Other"
		}
	}

	pub fn get_all_languages(&self) -> &'static [LanguageDef] {
		LANGUAGE_DEFINITIONS
	}

	pub fn detect_language(&self, filename: &str) -> String {
		if let Some(&lang) = SPECIAL_FILES.get(filename) {
			return lang.to_string();
		}

		if let Some(ext_pos) = filename.rfind('.') {
			let ext = filename[ext_pos + 1..].to_lowercase();
			if let Some(&lang) = LANGUAGE_MAP.get(ext.as_str()) {
				return lang.to_string();
			}
		}

		"Unknown".to_string()
	}

	pub fn get_supported_languages(&self) -> Vec<String> {
		let mut set: BTreeSet<String> = BTreeSet::new();
		for &lang in LANGUAGE_MAP.values() {
			set.insert(lang.to_string());
		}
		for &lang in SPECIAL_FILES.values() {
			set.insert(lang.to_string());
		}
		set.into_iter().collect()
	}

	pub fn get_common_excluded_languages(&self) -> Vec<String> {
		vec![
			"JSON".to_string(),
			"YAML".to_string(),
			"XML".to_string(),
			"SQL".to_string(),
			"GraphQL".to_string(),
			"TOML".to_string(),
			"Markdown".to_string(),
			"MDX".to_string(),
			"LaTeX".to_string(),
			"reStructuredText".to_string(),
		]
	}

	pub fn count_lines(&self, content: &str, language: &str) -> (u32, u32, u32, u32) {
		let mut total = 0u32;
		let mut blank = 0u32;
		let mut comment = 0u32;
		let mut code = 0u32;

		let line_markers = LINE_COMMENT_MARKERS.get(language).map(|v| v.as_slice()).unwrap_or(&[]);
		let block_markers = BLOCK_COMMENT_MARKERS.get(language);

		let mut in_block_comment = false;
		let mut block_end_marker = "";

		for line in content.lines() {
			total += 1;
			let trimmed = line.trim();

			if trimmed.is_empty() {
				blank += 1;
				continue;
			}

			if in_block_comment {
				comment += 1;
				if trimmed.contains(block_end_marker) {
					in_block_comment = false;
				}
				continue;
			}

			if let Some(&(start, end)) = block_markers {
				if trimmed.starts_with(start) {
					comment += 1;
					in_block_comment = true;
					block_end_marker = end;

					if trimmed.contains(end)
						&& trimmed.rfind(end).unwrap_or(0) > trimmed.find(start).unwrap_or(0)
					{
						in_block_comment = false;
					}
					continue;
				}
			}

			let mut is_comment = false;
			for &marker in line_markers {
				if trimmed.starts_with(marker) {
					comment += 1;
					is_comment = true;
					break;
				}
			}

			if !is_comment {
				code += 1;
			}
		}

		(total, blank, comment, code)
	}
}
