---
status: proposed
date: 2026-09-02
---

# Resolve explicit phrase references before categorical validation

EasyEyes will support language-specific values for every glossary parameter whose type is `categorical` or `multicategorical`. Experiment authors must mark a language-specific value with an explicit `~symbol`. The compiler resolves those references for the active experiment language, normalizes intentionally blank results, and then applies the existing glossary category validation. This keeps language selection general-purpose without allowing an ordinary misspelled category to become an implicit phrase lookup.

The compiler will treat categorical and multicategorical values differently. A categorical cell is one value, so a resolved blank becomes the parameter's normal empty/default behavior. A multicategorical cell is a comma-separated list, so each item is resolved independently and items that resolve to blank are removed. Literal items and resolved items may coexist in the same list.

The phrase table and active experiment language are bootstrap inputs. `_languagePhrasesSpreadsheet` must load the phrase table, and `_language` must establish the active language, before the general resolver runs. These bootstrap parameters are not resolved by the general categorical pass. Existing special handling for a phrase-backed `_language` remains responsible for breaking that dependency cycle.

## Considered options

### Look up every unrecognized category as a phrase symbol

Rejected because it makes a misspelling such as `wrongLangauge` ambiguous. The compiler should continue to report it as an invalid category unless the author explicitly writes `~wrongLangauge`.

### Add special handling only for `fontTolerateFaults`

Rejected because language-specific categories are useful for other categorical parameters, and parameter-specific phrase logic would duplicate parsing and validation rules.

### Resolve the entire multicategorical cell as one phrase

Rejected because it cannot represent a stable literal category combined with a language-specific category, such as `missingCharacters, ~EnglishIsWrongLanguage`.

## Consequences

- Every categorical parameter receives the same language-aware behavior.
- Existing literal category values retain their current meaning.
- Existing category validation remains the authority after resolution.
- A missing symbol or language column remains an error.
- An existing blank phrase cell is a valid value and invokes normal empty/default semantics.
- Multicategorical parsing and serialization must have one canonical implementation so resolution and validation cannot disagree about commas, whitespace, or empty items.

The complete behavior and examples are specified in [Language-aware categorical parameters](../specification-by-example/language-aware-categorical-parameters.md).
