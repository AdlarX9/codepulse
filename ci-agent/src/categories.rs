use crate::language;

pub fn aggregate_by_category(per_language: &[(String, u32)]) -> (u32, u32) {
    let category_map = language::get_category_map();
    let mut core_lines = 0u32;
    let mut info_lines = 0u32;

    for (lang, total) in per_language {
        let category = category_map.get(lang.as_str()).unwrap_or(&"info");
        if *category == "core" {
            core_lines += total;
        } else {
            info_lines += total;
        }
    }

    (core_lines, info_lines)
}
