/**
 * Dialog/modal instrumentation for simulated participants.
 *
 * Monkey-patches Swal.fire() and Swal.close() so that every modal open/close
 * is published to #ee-state via setEEState({ dialogOpen: ... }).
 *
 * Without this, the simulated participant dispatches clicks that may land on
 * invisible modals ("Saving…", "Need internet-connected phone", Q&A dialogs,
 * participant-ID prompts) and the observer cannot distinguish a blocked click
 * from a processed one.
 *
 * Patches BOTH the npm-imported Swal AND `window.Swal` if present. The CDN
 * build of remote-calibrator ships its own Swal on `window.Swal`, which is a
 * DIFFERENT instance from the npm `import Swal from "sweetalert2"`. Calls
 * from threshold.js go through window.Swal; calls from our own code may go
 * through either. Patching both ensures we never miss a fire/close.
 *
 * Default off in production; sim mode calls installDialogReporter().
 */

import Swal from "sweetalert2";
import { setEEState } from "./simulatedState";

let installed = false;

function patchSwalInstance(swal: any) {
  if (!swal || swal.__simPatched) return;
  Object.defineProperty(swal, "__simPatched", {
    value: true,
    enumerable: false,
  });
  const origFire = swal.fire;
  swal.fire = function (...args: any[]) {
    const title = typeof args[0] === "string" ? args[0] : args[0]?.title ?? "";
    setEEState({ dialogOpen: `Swal: ${title}` });
    return origFire.apply(swal, args);
  };
  const origClose = swal.close;
  swal.close = function () {
    setEEState({ dialogOpen: "" });
    return origClose.apply(swal);
  };
}

export function installDialogReporter(): void {
  if (installed) return;
  installed = true;
  // Patch the npm-imported instance (our own imports).
  patchSwalInstance(Swal);
  // Patch the global window.Swal if present (CDN load via rc, used by
  // threshold.js). Wait for it to appear if rc is still loading.
  const patchGlobal = () => {
    const g = (window as any).Swal;
    if (g) patchSwalInstance(g);
    else if (Date.now() - startedAt < 10_000) setTimeout(patchGlobal, 100);
  };
  const startedAt = Date.now();
  patchGlobal();
}
