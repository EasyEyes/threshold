/**
 * Cursor visibility while a SweetAlert modal is open.
 *
 * Q&A modals fire with backdrop:false, which makes the swal container
 * pointer-events:none. The cursor then falls through to the PixiJS canvas,
 * which inherits body's cursor. If hideCursor() was called at trial begin
 * (markingShowCursorBool false), the canvas shows cursor:none — the cursor
 * vanished whenever it left the modal box. utils.css guards this: while any
 * swal modal is open (body.swal2-shown), the cursor must stay visible.
 *
 * Run: npx playwright test tests/e2e/hide-cursor-modal.e2e.test.ts
 */

import { test, expect } from "@playwright/test";

const PAGE = "/tests/e2e/pages/hide-cursor-modal.html";

test.describe("cursor stays visible while a modal is open", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test("hide-cursor hides the canvas cursor during trials (no modal)", async ({
    page,
  }) => {
    await page.evaluate(() => {
      (window as any).setCursorHidden(true);
      (window as any).setModalOpen(false);
    });
    expect(await page.evaluate(() => (window as any).cursorOfCanvas())).toBe(
      "none",
    );
  });

  test("cursor is visible over the canvas while a modal is open", async ({
    page,
  }) => {
    await page.evaluate(() => {
      (window as any).setCursorHidden(true);
      (window as any).setModalOpen(true);
    });
    expect(await page.evaluate(() => (window as any).cursorOfCanvas())).toBe(
      "default",
    );
  });

  test("cursor hides again once the modal closes", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).setCursorHidden(true);
      (window as any).setModalOpen(true);
      (window as any).setModalOpen(false);
    });
    expect(await page.evaluate(() => (window as any).cursorOfCanvas())).toBe(
      "none",
    );
  });
});
