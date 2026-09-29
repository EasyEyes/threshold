// RSVP phrase-identification screens accumulated: each trial's
// onStimulusGenerated builds a fresh screen element and Object.assign
// replaces rsvpReadingResponse.screen — but nothing removed the OLD
// element from the DOM (the vocoder path has its own remover; this one
// had none). Stale opaque grids stacked underneath the newest screen,
// leaking memory and orphaned click handlers for the rest of the session.
//
// components/response.js cannot be imported under jsdom (its global.js
// chain fails to parse in jest — same limitation as lifetime.js), so this
// pins the fix as a source contract: showPhraseIdentification removes the
// previous screen BEFORE appending the new one.
const fs = require("fs");
const path = require("path");
const src = () =>
  fs.readFileSync(
    path.join(__dirname, "..", "components", "response.js"),
    "utf8",
  );

describe("showPhraseIdentification removes the previous screen", () => {
  it("previous #phrase-identification-response-screen is removed before append", () => {
    const s = src();
    const fn =
      /export const showPhraseIdentification = \(responseScreen\) => \{[\s\S]*?\n\};/.exec(
        s,
      );
    expect(fn).toBeTruthy();
    const body = fn[0];
    const removeAt = body.indexOf(
      'getElementById("phrase-identification-response-screen")',
    );
    const appendAt = body.indexOf("document.body.appendChild(responseScreen)");
    expect(removeAt).toBeGreaterThanOrEqual(0);
    expect(removeAt).toBeLessThan(appendAt);
  });
});
