use std::collections::HashMap;

lazy_static::lazy_static! {
    // Marqueurs de commentaire "ligne" par langage.
    // IMPORTANT: on ne met plus "#" pour JS/TS (ce n'est pas un commentaire ligne valide).
    static ref LINE_COMMENT_MARKERS: HashMap<&'static str, Vec<&'static str>> = {
        let mut m = HashMap::new();
        m.insert("JavaScript", vec!["//"]);
        m.insert("TypeScript", vec!["//"]);
        m.insert("Python", vec!["#"]);
        m.insert("Ruby", vec!["#"]);
        m.insert("Shell", vec!["#"]);
        m.insert("Bash", vec!["#"]);
        m.insert("Rust", vec!["//"]);
        m.insert("Go", vec!["//"]);
        m.insert("C", vec!["//"]);
        m.insert("C++", vec!["//"]);
        m.insert("C#", vec!["//"]);
        m.insert("Java", vec!["//"]);
        m.insert("Kotlin", vec!["//"]);
        m.insert("Swift", vec!["//"]);
        m.insert("PHP", vec!["//", "#"]);
        m.insert("CSS", vec![]);
        m.insert("HTML", vec![]);
        m.insert("SQL", vec!["--"]);
        m
    };

    static ref BLOCK_COMMENT_MARKERS: HashMap<&'static str, (&'static str, &'static str)> = {
        let mut m = HashMap::new();
        m.insert("JavaScript", ("/*", "*/"));
        m.insert("TypeScript", ("/*", "*/"));
        m.insert("Rust", ("/*", "*/"));
        m.insert("Go", ("/*", "*/"));
        m.insert("C", ("/*", "*/"));
        m.insert("C++", ("/*", "*/"));
        m.insert("C#", ("/*", "*/"));
        m.insert("Java", ("/*", "*/"));
        m.insert("Kotlin", ("/*", "*/"));
        m.insert("Swift", ("/*", "*/"));
        m.insert("CSS", ("/*", "*/"));
        m.insert("PHP", ("/*", "*/"));
        m.insert("HTML", ("<!--", "-->"));
        m.insert("XML", ("<!--", "-->"));
        m.insert("Python", ("\"\"\"", "\"\"\""));
        m
    };
}

pub fn count_lines(content: &str, language: &str) -> (u32, u32, u32, u32) {
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

        // Blank
        if trimmed.is_empty() {
            blank += 1;
            continue;
        }

        // Dans un bloc de commentaire
        if in_block_comment {
            comment += 1;
            if trimmed.contains(block_end_marker) {
                in_block_comment = false;
            }
            continue;
        }

        // Début bloc commentaire
        if let Some(&(start, end)) = block_markers {
            if trimmed.starts_with(start) {
                comment += 1;
                in_block_comment = true;
                block_end_marker = end;

                // Bloc commence et se termine sur la même ligne
                if trimmed.contains(end) && trimmed.rfind(end).unwrap() > trimmed.find(start).unwrap() {
                    in_block_comment = false;
                }
                continue;
            }
        }

        // Commentaire ligne
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_javascript() {
        let content = r#"
// Comment
function test() {
  const x = 1; // inline comment
  /* block comment */
  return x;
}
"#;
        let (total, blank, comment, code) = count_lines(content, "JavaScript");
        assert!(comment >= 2);
        assert!(code >= 3);
        assert!(total >= comment + code + blank);
    }
}