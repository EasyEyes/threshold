/** @jest-environment jsdom */
import { presentPause } from "../components/interaction/pausePresenter";
import Swal from "sweetalert2";
const text = {
  titleHtml: "Paused",
  bodyHtml: "Resume or Quit",
  resume: "Resume",
  quit: "Quit",
  language: "en",
  direction: "ltr",
};
afterEach(() => {
  document.body.innerHTML = "";
});
test("real SweetAlert remains pending across the pause and resolves only on its own Proceed", async () => {
  const scroll = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  const finished = jest.fn();
  const pending = Swal.fire({
    title: "Put your glasses back on",
    confirmButtonText: "Proceed",
    showClass: { popup: "" },
    hideClass: { popup: "" },
  }).then(finished);
  const original = Swal.getPopup();
  const button = Swal.getConfirmButton();
  const view = presentPause(document, text, {
    resume: jest.fn(),
    quit: jest.fn(),
  });
  await Promise.resolve();
  expect(finished).not.toHaveBeenCalled();
  view.close();
  expect(Swal.getPopup()).toBe(original);
  expect(Swal.getConfirmButton()).toBe(button);
  await Promise.resolve();
  expect(finished).not.toHaveBeenCalled();
  Swal.clickConfirm();
  await pending;
  expect(finished).toHaveBeenCalledWith(
    expect.objectContaining({ isConfirmed: true }),
  );
  scroll.mockRestore();
});
test("underlying RC popup retains DOM, handlers and pending continuation across Resume", () => {
  const popup = document.createElement("div");
  popup.className = "swal2-container";
  const proceed = document.createElement("button");
  proceed.textContent = "Proceed";
  popup.append(proceed);
  document.body.append(popup);
  const continuation = jest.fn();
  proceed.addEventListener("click", continuation);
  proceed.focus();
  const resume = jest.fn();
  const view = presentPause(document, text, { resume, quit: jest.fn() });
  expect(popup.hasAttribute("inert")).toBe(true);
  proceed.click();
  expect(continuation).not.toHaveBeenCalled();
  (
    document.querySelector('[data-action="resume"]') as HTMLButtonElement
  ).click();
  expect(resume).toHaveBeenCalledTimes(1);
  expect(continuation).not.toHaveBeenCalled();
  view.close();
  expect(document.querySelector(".swal2-container")).toBe(popup);
  expect(document.activeElement).toBe(proceed);
  expect(popup.hasAttribute("inert")).toBe(false);
  proceed.click();
  expect(continuation).toHaveBeenCalledTimes(1);
});
test("window capture blocks RC keyboard handlers and consumes Resume's trailing keyup", () => {
  const rcKey = jest.fn();
  document.addEventListener("keydown", rcKey, true);
  document.addEventListener("keyup", rcKey, true);
  let view: ReturnType<typeof presentPause>;
  view = presentPause(document, text, {
    resume: () => view.close(),
    quit: jest.fn(),
  });
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  document.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(rcKey).not.toHaveBeenCalled();
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "a", bubbles: true }),
  );
  expect(rcKey).toHaveBeenCalledTimes(1);
  document.removeEventListener("keydown", rcKey, true);
  document.removeEventListener("keyup", rcKey, true);
});
test("new background nodes are isolated and existing accessibility attributes restored", async () => {
  const existing = document.createElement("div");
  existing.setAttribute("inert", "");
  existing.setAttribute("aria-hidden", "false");
  document.body.append(existing);
  const view = presentPause(document, text, {
    resume: jest.fn(),
    quit: jest.fn(),
  });
  const later = document.createElement("div");
  document.body.append(later);
  await Promise.resolve();
  expect(later.hasAttribute("inert")).toBe(true);
  view.close();
  view.close();
  expect(existing.getAttribute("aria-hidden")).toBe("false");
  expect(existing.hasAttribute("inert")).toBe(true);
  expect(later.hasAttribute("inert")).toBe(false);
});
test("touch input inside the modal retains browser click synthesis", () => {
  const view = presentPause(document, text, {
    resume: jest.fn(),
    quit: jest.fn(),
  });
  const button = document.querySelector('[data-action="resume"]')!;
  const touch = new Event("touchstart", { bubbles: true, cancelable: true });
  button.dispatchEvent(touch);
  expect(touch.defaultPrevented).toBe(false);
  const outside = new Event("touchstart", { bubbles: true, cancelable: true });
  document.body.dispatchEvent(outside);
  expect(outside.defaultPrevented).toBe(true);
  view.close();
});
