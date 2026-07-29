/**
 * Source invariant: Firebase app and Firestore must be optimized together.
 *
 * If Vite discovers Firestore after the initial dependency optimization,
 * a page can retain firebase/app from the old cache generation while loading
 * Firestore from the new one. The two modules then use different component
 * registries and initializeFirestore throws:
 * "Component firestore has not been registered yet".
 *
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";
import { describe, expect, test } from "@jest/globals";

describe("vite.config.mjs — Firebase dependency optimization", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../vite.config.mjs"),
    "utf8",
  );

  test("pre-bundles firebase/app and firebase/firestore together", () => {
    expect(src).toMatch(
      /include:\s*\[\s*"firebase\/app",\s*"firebase\/firestore"\s*\]/,
    );
  });
});
