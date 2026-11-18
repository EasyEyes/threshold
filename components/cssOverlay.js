// DOM-only CSS startup helpers, extracted from threshold.js's module top
// level so the startup DOM behavior is unit-testable.

// Load a stylesheet asynchronously; resolves once loaded, rejects on error.
export const loadCSS = (href) => {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
};

// Center the given text over the page via a #root::after rule.
export const updateCSSAfterContentOfRoot = (newContent) => {
  // Create a style element
  const style = document.createElement("style");
  document.head.appendChild(style);

  // Add a rule for the #root::after with the new content
  style.sheet.insertRule(
    `
    #root::after {
      content: "${newContent}";
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
  `,
    style.sheet.cssRules.length,
  );
};
