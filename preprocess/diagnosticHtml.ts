/** Canonical HTML for values in compiler diagnostics. */
export const diagnosticValue = (value: unknown): string =>
  `<code class="error-value">${escapeDiagnosticHtml(String(value))}</code>`;

/** Wrap already-formatted diagnostic HTML (e.g. invisible-character labels). */
export const diagnosticValueHtml = (html: string): string =>
  `<code class="error-value">${html}</code>`;

export const diagnosticValues = (values: readonly unknown[]): string =>
  values.map(diagnosticValue).join(", ");

/** Singular/plural follows DISTINCT offending columns, not values per cell. */
export const diagnosticOffendingValuesLabel = (
  adjective: "erroneous" | "unimplemented",
  columnLabels: readonly string[],
): string =>
  `The ${adjective} ${
    new Set(columnLabels).size === 1 ? "value is" : "values are"
  }`;

export const escapeDiagnosticHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
