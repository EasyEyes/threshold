//! Font language support checks via shaperglot.
//!
//! Exposed to JavaScript for compile-time validation of file-based fonts.

use serde::Serialize;
use shaperglot::{Checker, Languages, SupportLevel};
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

static LANGUAGE_DB: OnceLock<Languages> = OnceLock::new();

fn languages() -> &'static Languages {
    LANGUAGE_DB.get_or_init(Languages::new)
}

#[derive(Serialize)]
struct LanguageCheckResponse {
    ok: bool,
    supported: bool,
    support_level: String,
    summary: String,
    problems: Vec<String>,
    error: Option<String>,
}

#[derive(Serialize)]
struct TextCoverageResponse {
    ok: bool,
    supported: bool,
    missing_characters: Vec<String>,
    missing_codepoints: Vec<u32>,
    error: Option<String>,
}

fn support_level_name(level: SupportLevel) -> &'static str {
    match level {
        SupportLevel::Complete => "Complete",
        SupportLevel::Supported => "Supported",
        SupportLevel::Incomplete => "Incomplete",
        SupportLevel::Unsupported => "Unsupported",
        SupportLevel::None => "None",
        SupportLevel::Indeterminate => "Indeterminate",
    }
}

fn language_is_supported(report: &shaperglot::Reporter) -> bool {
    matches!(
        report.support_level(),
        SupportLevel::Complete | SupportLevel::Supported | SupportLevel::Incomplete
    )
}

fn language_error(message: String) -> String {
    serde_json::to_string(&LanguageCheckResponse {
        ok: false,
        supported: false,
        support_level: "Unknown".to_string(),
        summary: String::new(),
        problems: vec![],
        error: Some(message),
    })
    .unwrap_or_else(|_| r#"{"ok":false,"supported":false,"error":"serialization failed"}"#.to_string())
}

fn text_error(message: String) -> String {
    serde_json::to_string(&TextCoverageResponse {
        ok: false,
        supported: false,
        missing_characters: vec![],
        missing_codepoints: vec![],
        error: Some(message),
    })
    .unwrap_or_else(|_| r#"{"ok":false,"supported":false,"error":"serialization failed"}"#.to_string())
}

/// Check whether a font supports a shaperglot language id (e.g. "ar_Arab").
#[wasm_bindgen]
pub fn check_font_language_support(font_data: &[u8], language_id: &str) -> String {
    match check_font_language_support_inner(font_data, language_id) {
        Ok(json) => json,
        Err(err) => language_error(err),
    }
}

/// Collapse shaperglot problems into one message per problem code.
///
/// Shaperglot's auxiliary-codepoint check runs one sub-check per character
/// (for continuous scoring), so a font missing N auxiliaries yields N
/// problems that each repeat "The following auxiliary characters are
/// missing from the font: X". Codepoint-coverage problems carry their
/// characters in context.glyphs, so we merge them into a single sentence
/// per code ("bases-missing", "marks-missing", "auxiliarys-missing", ...).
/// Problems from skipped checks ("Check skipped: ...") are omitted; other
/// problems are kept verbatim, deduplicated, in original order.
fn merged_problem_messages(report: &shaperglot::Reporter) -> Vec<String> {
    const MAX_LISTED_CHARS: usize = 40;

    enum Item {
        Coverage(String),
        Plain(String),
    }
    struct CoverageEntry {
        prefix: String,
        glyphs: Vec<String>,
    }

    let mut items: Vec<Item> = Vec::new();
    let mut coverage: std::collections::HashMap<String, CoverageEntry> =
        std::collections::HashMap::new();
    let mut seen_plain: std::collections::HashSet<String> = std::collections::HashSet::new();

    let problems = report
        .iter()
        .filter(|result| !matches!(result.status, shaperglot::ResultCode::Skip))
        .flat_map(|result| result.problems.iter());

    for problem in problems {
        let glyphs: Vec<String> = problem
            .context
            .get("glyphs")
            .and_then(|v| v.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|g| g.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default();

        if glyphs.is_empty() {
            if seen_plain.insert(problem.message.clone()) {
                items.push(Item::Plain(problem.message.clone()));
            }
            continue;
        }

        if let Some(entry) = coverage.get_mut(&problem.code) {
            entry.glyphs.extend(glyphs);
        } else {
            // "The following mark characters are missing from the font: X"
            // keeps everything before the colon as the reusable prefix.
            let prefix = problem
                .message
                .split_once(':')
                .map(|(p, _)| p.to_string())
                .unwrap_or_else(|| problem.message.clone());
            coverage.insert(problem.code.clone(), CoverageEntry { prefix, glyphs });
            items.push(Item::Coverage(problem.code.clone()));
        }
    }

    items
        .into_iter()
        .map(|item| match item {
            Item::Plain(message) => message,
            Item::Coverage(code) => {
                let entry = &coverage[&code];
                let mut glyphs = entry.glyphs.clone();
                glyphs.sort();
                glyphs.dedup();
                let total = glyphs.len();
                let listed = glyphs
                    .iter()
                    .take(MAX_LISTED_CHARS)
                    .map(String::as_str)
                    .collect::<Vec<_>>()
                    .join(", ");
                if total > MAX_LISTED_CHARS {
                    format!(
                        "{}: {} (+{} more)",
                        entry.prefix,
                        listed,
                        total - MAX_LISTED_CHARS
                    )
                } else {
                    format!("{}: {}", entry.prefix, listed)
                }
            }
        })
        .collect()
}

fn check_font_language_support_inner(font_data: &[u8], language_id: &str) -> Result<String, String> {
    let checker = Checker::new(font_data).map_err(|e| format!("Failed to load font: {e}"))?;
    let language = languages()
        .get_language(language_id)
        .ok_or_else(|| format!("Unknown EasyEyes language id \"{language_id}\""))?;

    let report = checker.check(language);
    if report.is_unknown() {
        return Err(format!(
            "Language \"{language_id}\" has no shaperglot checks defined"
        ));
    }

    let response = LanguageCheckResponse {
        ok: true,
        supported: language_is_supported(&report),
        support_level: support_level_name(report.support_level()).to_string(),
        summary: report.to_summary_string(language),
        problems: merged_problem_messages(&report),
        error: None,
    };

    serde_json::to_string(&response).map_err(|e| format!("Failed to serialize result: {e}"))
}

/// Unicode Default_Ignorable_Code_Point (DerivedCoreProperties.txt).
///
/// Shapers (HarfBuzz, CoreText) render these invisibly even when the font's
/// cmap lacks them, so treating them as "missing characters" would be a false
/// positive. Examples that occur in real corpora: ZWNJ (Persian half-space),
/// ZWJ, LRM/RLM/ALM bidi marks, variation selectors, soft hyphen, BOM.
fn is_default_ignorable(c: char) -> bool {
    matches!(
        u32::from(c),
        0x00AD                  // SOFT HYPHEN
        | 0x034F                // COMBINING GRAPHEME JOINER
        | 0x061C                // ARABIC LETTER MARK
        | 0x115F..=0x1160       // HANGUL CHOSEONG/JUNGSEONG FILLER
        | 0x17B4..=0x17B5       // KHMER VOWEL INHERENT AQ/AA
        | 0x180B..=0x180F       // MONGOLIAN FVS1-3, VOWEL SEPARATOR, FVS4
        | 0x200B..=0x200F       // ZWSP, ZWNJ, ZWJ, LRM, RLM
        | 0x202A..=0x202E       // bidi embedding/override controls
        | 0x2060..=0x2065       // WORD JOINER, invisible math operators
        | 0x206A..=0x206F       // deprecated format characters
        | 0x3164                // HANGUL FILLER
        | 0xFE00..=0xFE0F       // VARIATION SELECTOR-1..16
        | 0xFEFF                // ZERO WIDTH NO-BREAK SPACE (BOM)
        | 0xFFA0                // HALFWIDTH HANGUL FILLER
        | 0xFFF0..=0xFFF8       // reserved format characters
        | 0x1BCA0..=0x1BCA3     // shorthand format controls
        | 0x1D173..=0x1D17A     // musical symbol beam/phrase controls
        | 0xE0000..=0xE0FFF     // tags and variation selectors supplement
    )
}

/// Check whether every significant character in `text` is covered by the font.
/// Whitespace and default-ignorable characters are skipped.
#[wasm_bindgen]
pub fn check_font_text_coverage(font_data: &[u8], text: &str) -> String {
    match check_font_text_coverage_inner(font_data, text) {
        Ok(json) => json,
        Err(err) => text_error(err),
    }
}

fn check_font_text_coverage_inner(font_data: &[u8], text: &str) -> Result<String, String> {
    let checker = Checker::new(font_data).map_err(|e| format!("Failed to load font: {e}"))?;

    let significant: String = text
        .chars()
        .filter(|c| !c.is_whitespace() && !is_default_ignorable(*c))
        .collect();
    if significant.is_empty() {
        return Ok(serde_json::to_string(&TextCoverageResponse {
            ok: true,
            supported: true,
            missing_characters: vec![],
            missing_codepoints: vec![],
            error: None,
        }).unwrap());
    }

    if checker.can_shape(&significant) {
        return Ok(serde_json::to_string(&TextCoverageResponse {
            ok: true,
            supported: true,
            missing_characters: vec![],
            missing_codepoints: vec![],
            error: None,
        }).unwrap());
    }

    let mut missing_characters: Vec<String> = Vec::new();
    let mut missing_codepoints: Vec<u32> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for ch in significant.chars() {
        let cp = ch as u32;
        if !seen.insert(cp) {
            continue;
        }
        let sample = ch.to_string();
        if checker.can_shape(&sample) {
            continue;
        }
        missing_codepoints.push(cp);
        missing_characters.push(ch.to_string());
    }

    let response = TextCoverageResponse {
        ok: true,
        supported: missing_characters.is_empty(),
        missing_characters,
        missing_codepoints,
        error: None,
    };

    serde_json::to_string(&response).map_err(|e| format!("Failed to serialize result: {e}"))
}

#[cfg(test)]
mod tests {
    use super::is_default_ignorable;
    use super::merged_problem_messages;

    #[test]
    fn merges_codepoint_coverage_problems_by_code() {
        let mk = |code: &str, message: &str, glyphs: &[&str]| {
            let mut p = shaperglot::Problem::new("CodepointCoverage", code, message.to_string());
            p.context = serde_json::json!({ "glyphs": glyphs });
            p
        };
        let mut report = shaperglot::Reporter::new();
        report.add(shaperglot::CheckResult {
            problems: vec![
                mk(
                    "marks-missing",
                    "The following mark characters are missing from the font: \u{0301}, \u{0300}",
                    &["\u{0301}", "\u{0300}"],
                ),
                mk(
                    "auxiliarys-missing",
                    "The following auxiliary characters are missing from the font: Ă",
                    &["Ă"],
                ),
                mk(
                    "auxiliarys-missing",
                    "The following auxiliary characters are missing from the font: Ā",
                    &["Ā"],
                ),
            ],
            total_checks: 3,
            ..Default::default()
        });
        // Problems attached to skipped checks are excluded entirely.
        report.add(shaperglot::CheckResult {
            status: shaperglot::ResultCode::Skip,
            problems: vec![shaperglot::Problem::new(
                "SmallCaps",
                "smcp-missing",
                "Check skipped: missing smcp".to_string(),
            )],
            total_checks: 1,
            ..Default::default()
        });

        let messages = merged_problem_messages(&report);
        assert_eq!(messages.len(), 2);
        assert_eq!(
            messages[0],
            "The following mark characters are missing from the font: \u{0300}, \u{0301}"
        );
        assert_eq!(
            messages[1],
            "The following auxiliary characters are missing from the font: Ā, Ă"
        );
    }

    #[test]
    fn default_ignorables_are_recognized() {
        for c in [
            '\u{00AD}', // soft hyphen
            '\u{061C}', // Arabic letter mark
            '\u{200C}', // ZWNJ (Persian half-space)
            '\u{200D}', // ZWJ
            '\u{200E}', // LRM
            '\u{200F}', // RLM
            '\u{FE0F}', // variation selector-16
            '\u{FEFF}', // BOM
            '\u{E0100}', // variation selector-17
        ] {
            assert!(is_default_ignorable(c), "U+{:04X} should be ignorable", u32::from(c));
        }
    }

    #[test]
    fn visible_characters_are_not_ignorable() {
        for c in [
            'a',
            '\u{0640}', // Arabic tatweel (visible)
            '\u{0600}', // Arabic number sign (prepended concatenation mark, visible)
            '\u{06CC}', // Farsi yeh
            '\u{25CC}', // dotted circle
        ] {
            assert!(!is_default_ignorable(c), "U+{:04X} should be visible", u32::from(c));
        }
    }
}
