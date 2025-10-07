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
}

pub fn get_language_category(language: &str) -> &'static str {
    LANGUAGE_CATEGORIES.get(language).unwrap_or(&"info")
}

pub fn aggregate_by_category(per_language: &[(String, u32)]) -> (u32, u32) {
    let mut core_lines = 0u32;
    let mut info_lines = 0u32;
    
    for (lang, total) in per_language {
        let category = get_language_category(lang);
        if category == "core" {
            core_lines += total;
        } else {
            info_lines += total;
        }
    }
    
    (core_lines, info_lines)
}
