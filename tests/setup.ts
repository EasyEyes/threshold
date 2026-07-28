// Default fetch mock so the top-level await in glossary-loader.ts /
// phrases-loader.ts resolves when those modules are imported in a test
// environment (they normally run in the browser via Vite). Tests replace
// this with their own mocks in beforeEach; this only needs to get the
// module-level `await load*(window.location.pathname)` past import time
// without touching the network. Routing mirrors the netlify endpoints:
//   /functions/glossary?...     → GlossaryData
//   /functions/phrases?pinned=… → { version }
//   /functions/phrases?v=…      → PhrasesData
const glossaryPayload = {
  version: "",
  glossary: {},
  glossaryFull: [],
  superMatchingParams: [],
};
const phrasesPayload = { version: "1.0", phrases: {} };

(global as any).fetch = (url: string) => {
  const u = String(url);
  const data = u.includes("/functions/glossary")
    ? glossaryPayload
    : u.includes("?v=")
    ? phrasesPayload
    : { version: phrasesPayload.version };
  return Promise.resolve({
    status: 200,
    ok: true,
    json: () => Promise.resolve(data),
  });
};
