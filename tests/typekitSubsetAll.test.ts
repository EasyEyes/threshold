/**
 * processTypekitFonts must add each family to the kit with subset=all.
 *
 * The Adobe Fonts API kit-family POST accepts `subset` ("default" | "all"),
 * defaulting to "default" (basic-Latin subset). The default subset omits the
 * small-cap / old-style / fraction glyphs that smcp / onum / frac substitute
 * to, so a default-subset kit would bake fontFeatureSettings to no visible
 * effect for PAID Adobe fonts (which can't use the github.com/adobe-fonts
 * mirror). subset=all makes the kit serve the full font so the bake works.
 *
 * @jest-environment node
 */

jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));
const mockTypekit = { kitId: "", fonts: new Map<string, string>() };
jest.mock("../preprocess/global", () => ({
  typekit: mockTypekit,
}));

import { processTypekitFonts } from "../preprocess/fontCheck";

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function installKitMock(urls: string[]) {
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    urls.push(u);
    // family existence check: GET /families/<family> (no /kits/)
    if (/\/api\/v1\/json\/families\/[^/]+$/.test(u)) {
      return new Response("ok", { status: 200 });
    }
    // create kit: POST /kits?name=...
    if (/\/api\/v1\/json\/kits\?name=/.test(u)) {
      return new Response(JSON.stringify({ kit: { id: "kit123" } }), {
        status: 200,
      });
    }
    // add family: POST /kits/kit123/families/<family>?...
    if (/\/api\/v1\/json\/kits\/kit123\/families\//.test(u)) {
      return new Response(
        JSON.stringify({ family: { css_names: ["some-font"] } }),
        { status: 200 },
      );
    }
    // publish: POST /kits/kit123/publish
    if (/\/api\/v1\/json\/kits\/kit123\/publish/.test(u)) {
      return new Response(JSON.stringify({ published: true }), {
        status: 200,
      });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("processTypekitFonts — subset=all for feature baking", () => {
  it("adds each family to the kit with subset=all", async () => {
    const urls: string[] = [];
    installKitMock(urls);
    const map = { "some-font": { columns: ["A"], blocks: [1] } };
    await processTypekitFonts(["some-font"], map, "expName");

    const familyAdd = urls.find((u) =>
      /\/kits\/kit123\/families\/some-font/.test(u),
    );
    expect(familyAdd).toBeDefined();
    expect(familyAdd).toContain("subset=all");
  });

  it("passes subset=all for every family when multiple fonts", async () => {
    const urls: string[] = [];
    installKitMock(urls);
    const map = {
      "font-one": { columns: ["A"], blocks: [1] },
      "font-two": { columns: ["B"], blocks: [2] },
    };
    await processTypekitFonts(["font-one", "font-two"], map, "expName");

    const familyAdds = urls.filter((u) =>
      /\/kits\/kit123\/families\/(font-one|font-two)/.test(u),
    );
    expect(familyAdds.length).toBe(2);
    for (const u of familyAdds) expect(u).toContain("subset=all");
  });
});
