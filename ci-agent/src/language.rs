use std::collections::HashMap;
use std::path::Path;

pub fn detect_language(path: &Path) -> &'static str {
    // Check special filenames
    if let Some(filename) = path.file_name() {
        let filename_str = filename.to_string_lossy();
        match filename_str.as_ref() {
            "Dockerfile" => return "Docker",
            "Makefile" => return "Make",
            "Rakefile" | "Gemfile" | "Podfile" => return "Ruby",
            "CMakeLists.txt" => return "CMake",
            _ => {}
        }
    }

    // Detect by extension
    if let Some(ext) = path.extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        return match ext_str.as_ref() {
            // Web
            "js" | "jsx" => "JavaScript",
            "ts" | "tsx" => "TypeScript",
            "html" | "htm" => "HTML",
            "css" => "CSS",
            "scss" => "SCSS",
            "sass" => "Sass",
            "less" => "Less",
            "vue" => "Vue",
            "svelte" => "Svelte",

            // Backend
            "py" => "Python",
            "rb" => "Ruby",
            "php" => "PHP",
            "java" => "Java",
            "kt" | "kts" => "Kotlin",
            "scala" => "Scala",
            "go" => "Go",
            "rs" => "Rust",
            "c" | "h" => "C",
            "cpp" | "cc" | "cxx" | "hpp" | "hh" | "hxx" => "C++",
            "cs" => "C#",
            "swift" => "Swift",
            "m" => "Objective-C",
            "mm" => "Objective-C++",

            // Functional
            "hs" => "Haskell",
            "elm" => "Elm",
            "ex" | "exs" => "Elixir",
            "erl" => "Erlang",
            "ml" => "OCaml",
            "fs" => "F#",
            "clj" => "Clojure",

            // Shell
            "sh" | "bash" => "Shell",
            "zsh" => "Zsh",
            "fish" => "Fish",
            "ps1" => "PowerShell",

            // Data & Config
            "json" => "JSON",
            "yaml" | "yml" => "YAML",
            "toml" => "TOML",
            "xml" => "XML",
            "sql" => "SQL",
            "graphql" | "gql" => "GraphQL",

            // Markup
            "md" => "Markdown",
            "mdx" => "MDX",
            "tex" => "LaTeX",
            "rst" => "reStructuredText",

            // Other
            "lua" => "Lua",
            "r" => "R",
            "jl" => "Julia",
            "dart" => "Dart",
            "vim" => "Vimscript",

            _ => "Unknown",
        };
    }

    "Unknown"
}

pub fn get_category_map() -> HashMap<&'static str, &'static str> {
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
    m.insert("Shell", "core");
    m.insert("Bash", "core");
    m.insert("Zsh", "core");
    m.insert("Fish", "core");
    m.insert("PowerShell", "core");
    m.insert("SQL", "core");
    m.insert("GraphQL", "core");
    m.insert("Vue", "core");
    m.insert("Svelte", "core");
    m.insert("Vimscript", "core");

    // Markup and documentation (info)
    m.insert("Markdown", "info");
    m.insert("MDX", "info");
    m.insert("HTML", "info");
    m.insert("LaTeX", "info");
    m.insert("reStructuredText", "info");
    m.insert("CSS", "info");
    m.insert("SCSS", "info");
    m.insert("Sass", "info");
    m.insert("Less", "info");
    m.insert("JSON", "info");
    m.insert("YAML", "info");
    m.insert("TOML", "info");
    m.insert("XML", "info");
    m.insert("Docker", "info");
    m.insert("Make", "info");
    m.insert("CMake", "info");
    m.insert("Unknown", "info");

    m
}
