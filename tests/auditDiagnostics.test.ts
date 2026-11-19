/** @jest-environment node */
import { formatAuditDetails } from "../examples/auditDiagnostics";
import type { Alert } from "../preprocess/alerts";

const diagnostic = (overrides: Partial<Alert> = {}): Alert => ({
  name: "Glossary parameter not audited as used",
  message:
    'Parameter <a href="https://example.org/glossary?key=font&amp;row=2"><strong>font</strong></a> is unused.',
  hint: "Review the completed audit.",
  kind: "warning",
  context: "preprocessor",
  parameters: ["font"],
  ...overrides,
});

it("retains an audit's parameter link and provides corrective guidance", () => {
  const lines = formatAuditDetails(diagnostic()).join("\n");
  expect(lines).toContain("font: https://example.org/glossary?key=font&row=2");
  expect(lines).toContain("Review the affected parameter");
  expect(lines).toContain("scripts/glossary-audit/README.md");
  expect(lines).not.toContain("<a");
});

it.each([
  "Parameter is unrecognized",
  "Parameter contains values of the wrong type",
  "International phrase not defined",
])("adds nothing to the existing compiler error %s", (name) => {
  expect(formatAuditDetails(diagnostic({ name, kind: "error" }))).toEqual([]);
});

it("does not add audit guidance to unrelated warnings", () => {
  expect(formatAuditDetails(diagnostic({ name: "Other warning" }))).toEqual([]);
});

it("discards invalid or unsafe links while preserving valid references once", () => {
  const message = `<a href="javascript:alert(1)">unsafe</a>
    <a href="not-a-url">invalid</a>
    <a href='https://example.org/source'>source</a>
    <a href="https://example.org/source">source again</a>`;
  const text = formatAuditDetails(diagnostic({ message })).join("\n");
  expect(text).not.toContain("javascript:");
  expect(text).not.toContain("not-a-url");
  expect(text.match(/https:\/\/example.org\/source/g)).toHaveLength(1);
});

it.each([
  "Study phrase analysis unavailable",
  "Study glossary analysis unavailable",
])("explains local index recovery for %s", (name) => {
  const text = formatAuditDetails(diagnostic({ name, kind: "error" })).join(
    "\n",
  );
  expect(text).toContain("Fix source-index build or parse errors");
  expect(text).toContain("scripts/phrase-analysis/build.mjs");
});

it("shows source-analysis phrase references while keeping the diagnostic a warning", () => {
  const warning = diagnostic({
    code: "study_phrase_candidates_missing",
    name: "Warning: 1 missing phrase",
    kind: "warning",
    message:
      '<a href="https://example.org/phrases?key=EE_missing">EE_missing</a>',
  });
  const text = formatAuditDetails(warning).join("\n");
  expect(text).toContain(
    "EE_missing: https://example.org/phrases?key=EE_missing",
  );
  expect(text).toContain("does not block compilation");
  expect(warning.kind).toBe("warning");
});

it("retains every phrase label when several keys share the same sheet link", () => {
  const text = formatAuditDetails(
    diagnostic({
      message:
        '<a href="https://example.org/sheet">EE_first</a> <a href="https://example.org/sheet">RC_second</a>',
    }),
  ).join("\n");
  expect(text).toContain("EE_first, RC_second: https://example.org/sheet");
});

it("renders diagnostic details using their severity colors", () => {
  const failure = formatAuditDetails(
    diagnostic({ name: "Study glossary analysis unavailable", kind: "error" }),
    true,
  ).join("\n");
  expect(failure).toContain("\x1b[31m");
  const warning = formatAuditDetails(diagnostic(), true).join("\n");
  expect(warning).toContain("\x1b[33m");
  expect(warning).not.toContain("\x1b[31m");
  expect(formatAuditDetails(diagnostic(), false).join("\n")).not.toContain(
    "\x1b[",
  );
});
