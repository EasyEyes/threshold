/** Escape arbitrary text for authored alert HTML. */
export const escapeAlertHtml = (text: string): string =>
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

/** Canonical parameter-name markup; optionally links a numbered family key. */
export const alertParameter = (name: string, glossaryKey?: string): string =>
  `<span class="alert-parameter"${
    glossaryKey ? ` data-glossary-key="${escapeAlertHtml(glossaryKey)}"` : ""
  }>${escapeAlertHtml(name)}</span>`;

/** Canonical HTML for a literal value. */
export const alertValue = (value: unknown): string =>
  `<code class="alert-value">${escapeAlertHtml(String(value))}</code>`;

/** Wrap trusted alert HTML, such as a link or invisible-character label. */
export const alertValueHtml = (html: string): string =>
  `<code class="alert-value">${html}</code>`;

export const alertValues = (values: readonly unknown[]): string =>
  values.map(alertValue).join(", ");

/** Semantic highlights shared by browser cards and terminal output. */
export const alertInvalid = (text: string): string =>
  `<span class="alert-invalid">${escapeAlertHtml(text)}</span>`;

export const alertDeleted = (text: string): string =>
  `<span class="alert-deleted">${escapeAlertHtml(text)}</span>`;

export const alertInserted = (text: string): string =>
  `<span class="alert-inserted">${escapeAlertHtml(text)}</span>`;

/** Singular/plural follows DISTINCT offending columns, not values per cell. */
export const alertOffendingValuesLabel = (
  adjective: "erroneous" | "unimplemented",
  columnLabels: readonly string[],
): string =>
  `The ${adjective} ${
    new Set(columnLabels).size === 1 ? "value is" : "values are"
  }`;
