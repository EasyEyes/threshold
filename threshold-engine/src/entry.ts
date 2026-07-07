/**
 * Reference-by-URL entry generation (issue #174).
 *
 * Builds the same-origin-required files of a referenced experiment repo:
 * the entry index.html (which loads the participant runtime from the
 * immutable release URL) and the asset-bridge service worker, emitted in
 * the coi-serviceworker.js slot. Everything else the runtime needs ships
 * in the release under runtime/ and is served by the bridge or by native
 * module resolution relative to the runtime's own script URL.
 */
import indexHtml from "../../index.html?text";
import indexStepperBoolHtml from "../../index-stepper-bool.html?text";
import coiServiceWorker from "../../coi-serviceworker.js?text";
import assetBridge from "./runtime/assetBridge.sw.js?text";

import type { EngineFile } from "../contract/engine-compile";

const FAVICON_TAG =
  '<link rel="icon" type="image/x-icon" href="components/images/favicon.ico" />';

const RUNTIME_SCRIPT_TAGS =
  /[ \t]*<!-- initial load -->\s*<script type="module" src="js\/first\.min\.js"><\/script>\s*<!-- experiment -->\s*<script type="module" src="js\/threshold\.min\.js" defer><\/script>/;

/**
 * Loads the runtime only once the asset-bridge service worker controls the
 * page, so page-relative runtime fetches (js/threshold.css, models/, ...)
 * are never racing the registration. If registration is impossible the
 * runtime is still loaded — compiled data works, bridged assets 404.
 */
const bootstrapScript = (base: string): string => `    <script>
      (async () => {
        if ("serviceWorker" in navigator && window.isSecureContext) {
          try {
            await navigator.serviceWorker.register("coi-serviceworker.js");
            if (!navigator.serviceWorker.controller) {
              await new Promise((resolve) =>
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  resolve,
                  { once: true },
                ),
              );
            }
          } catch (error) {
            console.error(
              "[EasyEyes] asset-bridge service worker registration failed:",
              error,
            );
          }
        }
        for (const src of [
          ${JSON.stringify(`${base}js/first.min.js`)},
          ${JSON.stringify(`${base}js/threshold.min.js`)},
        ]) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.type = "module";
            script.src = src;
            script.onload = resolve;
            script.onerror = () =>
              reject(new Error("[EasyEyes] failed to load " + src));
            document.body.appendChild(script);
          });
        }
      })().catch((error) =>
        console.error("[EasyEyes] runtime bootstrap failed:", error),
      );
    </script>`;

export const buildEntryFiles = (
  entryBaseUrl: string,
  stepperBool: boolean,
): EngineFile[] => {
  const base = entryBaseUrl.endsWith("/") ? entryBaseUrl : `${entryBaseUrl}/`;

  // Same template selection as the legacy copy flow
  // (gitlabUtils.getGitlabBodyForThreshold).
  const template = stepperBool ? indexHtml : indexStepperBoolHtml;
  if (!RUNTIME_SCRIPT_TAGS.test(template) || !template.includes(FAVICON_TAG))
    throw new Error(
      "Entry template drift: index.html no longer matches the shapes the engine rewrites.",
    );

  const entry = template
    .replace(
      FAVICON_TAG,
      `<link rel="icon" type="image/x-icon" href="${base}components/images/favicon.ico" />`,
    )
    .replace(RUNTIME_SCRIPT_TAGS, bootstrapScript(base));

  const serviceWorker = `${coiServiceWorker}\n${assetBridge.replace(
    /__EASYEYES_RUNTIME_BASE__/g,
    base,
  )}`;

  return [
    { path: "index.html", content: entry },
    { path: "coi-serviceworker.js", content: serviceWorker },
  ];
};
