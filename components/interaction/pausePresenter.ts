import type { PauseActions, PauseView } from "./pauseController";

/** A separate modal leaves SweetAlert's DOM, instance, and pending Promise intact. */
export function presentPause(
  doc: Document,
  text: {
    titleHtml: string;
    bodyHtml: string;
    resume: string;
    quit: string;
    language: string;
    direction: string;
  },
  actions: PauseActions,
): PauseView {
  const win = doc.defaultView!;
  const previousFocus = doc.activeElement as HTMLElement | null;
  const dialog = doc.createElement("dialog");
  dialog.id = "ee-interaction-pause";
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "ee-interaction-pause-title");
  dialog.setAttribute("aria-describedby", "ee-interaction-pause-body");
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  dialog.lang = text.language;
  dialog.dir = text.direction;
  dialog.style.cssText =
    "position:fixed;inset:0;margin:auto;box-sizing:border-box;width:min(90vw,36rem);max-height:90vh;overflow:auto;border:0;border-radius:.5rem;padding:2rem;background:white;color:#222;z-index:2147483647;box-shadow:0 0 0 100vmax rgba(0,0,0,.5);font:1.15rem system-ui;";
  const title = doc.createElement("h2");
  title.id = "ee-interaction-pause-title";
  title.innerHTML = text.titleHtml;
  const body = doc.createElement("div");
  body.id = "ee-interaction-pause-body";
  body.innerHTML = text.bodyHtml;
  const buttons = doc.createElement("div");
  buttons.style.cssText =
    "display:flex;gap:1rem;justify-content:space-between;margin-top:1.5rem;flex-wrap:wrap";
  const resume = doc.createElement("button");
  resume.type = "button";
  resume.textContent = text.resume;
  resume.dataset.action = "resume";
  resume.className = "btn btn-success";
  const quit = doc.createElement("button");
  quit.type = "button";
  quit.textContent = text.quit;
  quit.dataset.action = "quit";
  quit.className = "btn btn-danger";
  for (const button of [resume, quit])
    button.style.cssText = "font:inherit;cursor:pointer;padding:.6rem 1.2rem";
  buttons.append(resume, quit);
  dialog.append(title, body, buttons);
  let closed = false;
  const heldKeys = new Set<string>();
  const saved = new Map<
    Element,
    { inert: string | null; hidden: string | null }
  >();
  const makeInert = () => {
    for (const child of Array.from(doc.body.children)) {
      if (child === dialog || saved.has(child)) continue;
      saved.set(child, {
        inert: child.getAttribute("inert"),
        hidden: child.getAttribute("aria-hidden"),
      });
      child.setAttribute("inert", "");
      child.setAttribute("aria-hidden", "true");
    }
  };
  const activate = (target: EventTarget | null) => {
    if (closed) return;
    if (target === resume && !resume.disabled) actions.resume();
    else if (target === quit && !quit.disabled) actions.quit();
  };
  const capture = (event: Event) => {
    // Window capture runs before RC's document/body key and click handlers.
    event.stopImmediatePropagation();
    const inside = dialog.contains(event.target as Node);
    const explicitAction = [
      "click",
      "dblclick",
      "keydown",
      "keyup",
      "keypress",
      "contextmenu",
    ].includes(event.type);
    // Preserve native focus, scrolling and touch-to-click synthesis inside the
    // modal. Only its click/keyboard actions are dispatched explicitly below.
    if (event.cancelable && (!inside || explicitAction)) event.preventDefault();
    if (event.type === "click") activate(event.target);
    if (event.type === "keyup") heldKeys.delete((event as KeyboardEvent).key);
    if (event.type === "keydown") {
      const key = event as KeyboardEvent;
      heldKeys.add(key.key);
      if (key.key === "Tab") {
        const available = [resume, quit].filter((button) => !button.disabled);
        if (!available.length) return;
        const index = available.indexOf(doc.activeElement as HTMLButtonElement);
        const next =
          (index + (key.shiftKey ? -1 : 1) + available.length) %
          available.length;
        available[next].focus();
      } else if (!key.repeat && (key.key === "Enter" || key.key === " ")) {
        activate(doc.activeElement);
      }
    }
  };
  const events = [
    "keydown",
    "keyup",
    "keypress",
    "click",
    "dblclick",
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "touchstart",
    "touchend",
    "wheel",
    "contextmenu",
  ];
  const focus = (event: FocusEvent) => {
    if (!dialog.contains(event.target as Node)) {
      event.stopImmediatePropagation();
      (resume.disabled ? quit : resume).focus();
    }
  };
  const observer = new MutationObserver(makeInert);
  function close() {
    if (closed) return;
    closed = true;
    observer.disconnect();
    events.forEach((type) => win.removeEventListener(type, capture, true));
    // Resume on Enter/Space must not deliver its trailing keyup to the RC page.
    if (heldKeys.size) {
      const swallowRelease = (event: KeyboardEvent) => {
        if (!heldKeys.has(event.key)) return;
        event.stopImmediatePropagation();
        event.preventDefault();
        heldKeys.delete(event.key);
        if (!heldKeys.size) {
          win.removeEventListener("keyup", swallowRelease, true);
          win.clearTimeout(timer);
        }
      };
      const timer = win.setTimeout(
        () => win.removeEventListener("keyup", swallowRelease, true),
        1000,
      );
      win.addEventListener("keyup", swallowRelease, true);
    }
    win.removeEventListener("focusin", focus, true);
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    dialog.remove();
    for (const [element, original] of saved) {
      // Restore only attributes still carrying this view's value.
      if (element.getAttribute("inert") === "") {
        if (original.inert === null) element.removeAttribute("inert");
        else element.setAttribute("inert", original.inert);
      }
      if (element.getAttribute("aria-hidden") === "true") {
        if (original.hidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", original.hidden);
      }
    }
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
  }
  try {
    doc.body.append(dialog);
    events.forEach((type) =>
      win.addEventListener(type, capture, { capture: true, passive: false }),
    );
    win.addEventListener("focusin", focus, true);
    makeInert();
    observer.observe(doc.body, { childList: true });
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    resume.focus();
  } catch (error) {
    close();
    throw error;
  }
  return {
    close,
    setBusy(busy) {
      resume.disabled = busy;
      dialog.setAttribute("aria-busy", String(busy));
      // Quit stays available while a fullscreen request is pending.
      if (busy && doc.activeElement === resume) quit.focus();
      else if (!busy) resume.focus();
    },
  };
}
