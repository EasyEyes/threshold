/**
 * HTMLTextStim e2e — Markdown renders visually in the DOM overlay.
 *
 * Faithfulness proof: the v20.0 phrase
 * "Press **space** for next page." must render with bold "space" (no literal
 * asterisks) when shown via the tinyHint overlay — and the overlay must
 * behave like canvas text (positioned, non-selectable, non-interactive).
 */
import { test, expect } from "@playwright/test";

const PAGE = "/tests/e2e/pages/html-text-stim.html";
const STIM = '.ee-html-text-stim[data-name="tinyHint"]';

test.describe("HTMLTextStim overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForSelector(STIM);
  });

  test("**bold** renders as bold text, no literal asterisks", async ({
    page,
  }) => {
    const el = page.locator(STIM);
    await expect(el).toHaveText("Press space for next page.");
    const strong = el.locator("strong");
    await expect(strong).toHaveText("space");
    const weight = await strong.evaluate((n) => getComputedStyle(n).fontWeight);
    expect(Number(weight)).toBeGreaterThanOrEqual(700);
    await expect(el).not.toContainText("**");
  });

  test("tinyHint anchor: bottom edge sits at canvas bottom, centered", async ({
    page,
  }) => {
    const box = await page.locator(STIM).boundingBox();
    const stage = await page.locator("#stage").boundingBox();
    expect(box).not.toBeNull();
    // alignVert bottom → element bottom == canvas bottom (y=600)
    expect(box.y + box.height).toBeCloseTo(stage.y + 600, 0);
    // alignHoriz center → horizontally centered on the canvas
    expect(box.x + box.width / 2).toBeCloseTo(stage.x + 400, 0);
  });

  test("non-interactive: not selectable, clicks pass through", async ({
    page,
  }) => {
    const style = await page.locator(STIM).evaluate((n) => {
      const cs = getComputedStyle(n);
      return { userSelect: cs.userSelect, pointerEvents: cs.pointerEvents };
    });
    expect(style.userSelect).toBe("none");
    expect(style.pointerEvents).toBe("none");
  });

  test("setDirection rtl applies dir/lang; Arabic renders", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.__stim.setDirection("rtl", "ar");
      window.__stim.setText("اضغط على مفتاح **المسافة** للانتقال.");
    });
    const el = page.locator(STIM);
    await expect(el).toHaveAttribute("dir", "rtl");
    await expect(el).toHaveAttribute("lang", "ar");
    await expect(el.locator("strong")).toHaveText("المسافة");
    await expect(el).not.toContainText("**");
  });

  test("setAutoDraw(false) hides; setText updates content", async ({
    page,
  }) => {
    const el = page.locator(STIM);
    await page.evaluate(() => window.__stim.setAutoDraw(false));
    await expect(el).toBeHidden();
    await page.evaluate(() => {
      window.__stim.setAutoDraw(true);
      window.__stim.setText("To continue, press **return**.");
    });
    await expect(el).toBeVisible();
    await expect(el.locator("strong")).toHaveText("return");
  });
});

test.describe("block instructions (isInstruction, pt, wrap)", () => {
  const INSTR = '.ee-html-text-stim[data-name="instructions"]';

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForSelector(INSTR);
  });

  test("markdown bold renders inside wrapped instruction text", async ({
    page,
  }) => {
    const el = page.locator(INSTR);
    await expect(el.locator("strong").first()).toHaveText("carefully");
    await expect(el).not.toContainText("**");
  });

  test("pt font size (instruction convention)", async ({ page }) => {
    const size = await page.locator(INSTR).evaluate((n) => n.style.fontSize);
    expect(size).toBe("25pt");
  });

  test("dynamicSetSize shrinks pt height until text fits viewport", async ({
    page,
  }) => {
    // 30 wrapped lines at 25pt overflow an 800px-tall viewport.
    const before = await page
      .locator(INSTR)
      .evaluate((n) => n.getBoundingClientRect().height);
    expect(before).toBeGreaterThan(800);

    await page.evaluate(() => window.__dynamicSetSize([window.__instr], 25));

    const after = await page.locator(INSTR).evaluate((n) => ({
      height: n.getBoundingClientRect().height,
      fontSize: n.style.fontSize,
    }));
    expect(after.height).toBeLessThanOrEqual(800 * 0.8);
    expect(after.fontSize).not.toBe("25pt");
    expect(after.fontSize.endsWith("pt")).toBe(true);
  });

  test("RTL instruction: dir=rtl, right-aligned, no punctuation hacks", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.__instr.setDirection("rtl", "ar");
      window.__instr.setAlignHoriz("right");
      window.__instr.setText("اقرأ هذه التعليمات **بعناية** قبل المتابعة.");
    });
    const el = page.locator(INSTR);
    await expect(el).toHaveAttribute("dir", "rtl");
    await expect(el.locator("strong")).toHaveText("بعناية");
    // Browser bidi: trailing period stays sentence-final (no manual flip).
    await expect(el).toHaveText("اقرأ هذه التعليمات بعناية قبل المتابعة.");
    const align = await el.evaluate((n) => getComputedStyle(n).textAlign);
    expect(align).toBe("right");
  });
});
