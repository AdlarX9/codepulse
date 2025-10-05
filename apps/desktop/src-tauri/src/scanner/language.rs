use std::collections::HashMap;

lazy_static::lazy_static! {
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

pub fn detect_language(filename: &str) -> String {
    // Fichiers spéciaux
    if let Some(&lang) = SPECIAL_FILES.get(filename) {
        return lang.to_string();
    }
    // Extension
    if let Some(ext_pos) = filename.rfind('.') {
        let ext = &filename[ext_pos + 1..].to_lowercase();
        if let Some(&lang) = LANGUAGE_MAP.get(ext.as_str()) {
            return lang.to_string();
        }
    }
    "Unknown".to_string()
}