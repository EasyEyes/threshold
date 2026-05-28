// Default fetch mock so the TLA in glossary-loader.ts resolves when the module
// is imported in a test environment (it normally runs in browser via Vite).
(global as any).fetch = () =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        version: "",
        glossary: {},
        glossaryFull: [],
        superMatchingParams: [],
      }),
  });
