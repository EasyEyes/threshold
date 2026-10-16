// Local stub for the EasyEyes Netlify functions (phrases + glossary), backed
// by tests/__cache__ payloads, so sim e2e runs survive a backend outage.
// Point the experiment at it via ?preview-deploy=http://localhost:PORT.
import http from "node:http";
import fs from "node:fs";

const PORT = Number(process.argv[2] ?? 5701);
const phrases = fs.readFileSync("tests/__cache__/phrases.json");
const phrasesVersion = JSON.parse(phrases.toString()).version;
const glossary = fs.readFileSync("tests/__cache__/glossary.json");

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const json = (body, status = 200) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    });
    res.end(body);
  };
  if (path === "/.netlify/functions/phrases" && url.searchParams.has("pinned")) {
    json(JSON.stringify({ version: phrasesVersion }));
  } else if (path === "/.netlify/functions/phrases") {
    json(phrases);
  } else if (path === "/.netlify/functions/glossary") {
    json(glossary);
  } else {
    json(JSON.stringify({ error: `stub: no route for ${path}` }), 404);
  }
});
server.listen(PORT, () => console.log(`stub ready on :${PORT}`));
