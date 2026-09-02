# Experiment Parameter Compilation

This context defines how an experiment table becomes a language-specific, validated parameter table.

## Language

**Literal category**:
A category written directly in an experiment-table cell and defined by the parameter's glossary entry.
_Avoid_: Hard-coded translation

**Phrase reference**:
An explicit `~symbol` that selects a value from the phrase table for the active experiment language.
_Avoid_: Invalid category, translated category

**Active experiment language**:
The language code used to select phrase-table values for one compiler run.
_Avoid_: Source language, interface language

**Resolved category**:
The literal category produced after a phrase reference is evaluated for the active experiment language.
_Avoid_: Translation

**Intentional blank**:
An existing phrase-table cell whose empty value means that no category is selected for that language.
_Avoid_: Missing translation

**Missing translation**:
The absence of the active experiment language column for a phrase symbol. It is an error, unlike an intentional blank.
_Avoid_: Intentional blank
