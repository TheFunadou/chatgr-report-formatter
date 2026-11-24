use unicode_normalization::char::is_combining_mark;
use unicode_normalization::UnicodeNormalization;

/// Collapses surrounding and repeated whitespace without altering the value's case.
pub fn normalize_display(value: &str) -> String {
    value.split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// Comparison key used across cleaning rules and analytics.
///
/// Trims, collapses whitespace, lowercases and removes diacritics so that values
/// such as `Organico`, ` organico ` and `Orgánico` compare as the same key. The
/// original value is never modified by this function.
pub fn normalize_key(value: &str) -> String {
    normalize_display(value)
        .to_lowercase()
        .nfd()
        .filter(|c| !is_combining_mark(*c))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_key_handles_case_whitespace_and_diacritics() {
        assert_eq!(normalize_key("  Orgánico  "), "organico");
        assert_eq!(normalize_key("EN   SEGUIMIENTO"), "en seguimiento");
        assert_eq!(normalize_key("Campaña"), "campana");
        assert_eq!(normalize_key("sin estatus"), "sin estatus");
    }

    #[test]
    fn normalize_display_keeps_case_but_collapses_spaces() {
        assert_eq!(normalize_display("  Juan   Pérez "), "Juan Pérez");
        assert_eq!(normalize_display("\t\n"), "");
    }
}
