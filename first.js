// Import only what's needed for initial page rendering
import { initProgress } from "./components/timeoutUtils.js";
import * as sentry from "./components/sentry";
import { localizeLoadingScreen } from "./components/loadingScreenText";

// Resolve the EasyEyes base URL for the loading-screen phrases fetch. Kept
// self-contained (no shared imports) so first.js stays a standalone bundle —
// see loadPhrases below. Mirrors components/easyeyesBaseUrl.ts for the deployed
// cases (preview-deploy param, production); a local dev server is assumed at
// :8888 without probing, since the spinner falls back gracefully on failure.
const getBaseUrl = () => {
  const previewDeployBase = new URLSearchParams(window.location.search).get(
    "preview-deploy",
  );
  if (previewDeployBase) return previewDeployBase;
  if (window.location.hostname !== "localhost") return "https://easyeyes.app";
  return "http://localhost:8888";
};

// Load phrases for the loading screen from the same versioned read-path the
// experiment uses. Inlined here (not imported from preprocess/phrases-loader,
// which has a top-level await) so first.js bundles standalone — sharing a module
// across that async boundary would split a chunk that Pavlovia does not deploy.
// A single attempt is enough: setupInitialUI's .catch falls back to plain text.
const loadPhrases = async () => {
  const [username, experimentName] = window.location.pathname
    .split("/")
    .filter(Boolean);
  const base = getBaseUrl();
  // Two-step read: resolve the (mutable, uncached) pin to a version, then fetch
  // the immutable payload by explicit ?v= — the same cacheable URL the
  // experiment loader uses. Single attempt: the .catch falls back to plain text.
  const pinnedRes = await fetch(
    `${base}/.netlify/functions/phrases?pinned=${username}/${experimentName}`,
  );
  if (!pinnedRes.ok)
    throw new Error(`phrases pin fetch failed: ${pinnedRes.status}`);
  const { version } = await pinnedRes.json();
  const res = await fetch(`${base}/.netlify/functions/phrases?v=${version}`);
  if (!res.ok) throw new Error(`phrases fetch failed: ${res.status}`);
  const data = await res.json();
  return data.phrases;
};

// Initial UI setup function - show spinner immediately
const setupInitialUI = () => {
  // experimentLanguageDirection is defined (alongside experimentLanguage) in
  // the compile-time generated js/experimentLanguage.js loaded by index.html;
  // it holds the _language's direction per the phrases' EE_LanguageDirection.
  // Set <body dir> so every HTML element inherits the experiment's text
  // direction by default. Guarded with typeof: experiments compiled before
  // this constant existed ship an experimentLanguage.js without it.
  document.body.setAttribute(
    "dir",
    typeof experimentLanguageDirection !== "undefined" &&
      String(experimentLanguageDirection).toLowerCase() === "rtl"
      ? "rtl"
      : "ltr",
  );

  // Start the progress animation immediately (no i18n needed)
  initProgress.startProgressAnimation();

  // Create loading indicator with spinner only (no text initially)
  const loadingElement = document.createElement("div");
  loadingElement.className = "loading-container";
  loadingElement.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text"></div>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-percent" id="progressPercent">0%</div>
      <div id="timeoutMessage" class="timeout-message" style="display: none;"></div>
      <button id="reloadButton" class="reload-button" style="display: none;"></button>
    </div>
  `;
  document.body.appendChild(loadingElement);

  // Show the timeout message and reload button only once BOTH conditions hold:
  // the 10s timer has fired and phrases have loaded (so they have localized
  // text). Either side can be the last to happen, so each calls this helper.
  let phrasesLoaded = false;
  let timeoutReached = false;
  const maybeShowTimeoutUI = () => {
    if (!phrasesLoaded || !timeoutReached || !loadingElement.parentNode) return;
    const timeoutMessage = document.getElementById("timeoutMessage");
    const reloadButton = document.getElementById("reloadButton");
    if (timeoutMessage) {
      timeoutMessage.style.display = "block";
    }
    if (reloadButton) {
      reloadButton.style.display = "block";
    }
  };

  // Lazy-load i18n and update text elements once available
  loadPhrases()
    .then((phrases) => {
      // experimentLanguage is loaded in the index.html
      const text = localizeLoadingScreen(phrases, experimentLanguage);
      if (text) {
        // Update text elements (DOM already has them, just populate)
        const loadingText = loadingElement.querySelector(".loading-text");
        if (loadingText) {
          loadingText.textContent = text.loadingText;
        }
        const timeoutMessage = document.getElementById("timeoutMessage");
        if (timeoutMessage) {
          timeoutMessage.textContent = text.timeoutMessage;
        }
        const reloadButton = document.getElementById("reloadButton");
        if (reloadButton) {
          reloadButton.textContent = text.reloadButton;
        }
        phrasesLoaded = true;
        maybeShowTimeoutUI();
      }
    })
    .catch((err) => {
      console.warn("Failed to load phrases:", err);
      const loadingText = loadingElement.querySelector(".loading-text");
      if (loadingText) {
        loadingText.textContent = "Loading …";
      }
    });

  // Setup timeout warning and reload button (10 seconds)
  const timeoutWarningTimer = setTimeout(() => {
    timeoutReached = true;
    maybeShowTimeoutUI();
  }, 10000);

  // Reload button click handler
  const reloadButton = document.getElementById("reloadButton");
  if (reloadButton) {
    reloadButton.addEventListener("click", () => {
      window.location.reload();
    });
  }

  // Listen for initialization progress updates
  window.addEventListener("threshold-init-progress", (event) => {
    const { percentage } = event.detail;
    const progressFill = document.getElementById("progressFill");
    const progressPercent = document.getElementById("progressPercent");

    if (progressFill) {
      progressFill.style.width = percentage + "%";
    }
    if (progressPercent) {
      progressPercent.textContent = Math.round(percentage) + "%";
    }
  });

  // Extract loading screen removal function
  const removeLoadingScreen = () => {
    // Clear timeout timer
    clearTimeout(timeoutWarningTimer);

    // Stop progress animation and ensure progress bar shows 100%
    initProgress.stopProgressAnimation();
    initProgress.currentPercentage = 100;
    initProgress.notifyListeners();

    if (loadingElement.parentNode) {
      loadingElement.remove();
    }
  };

  // Expose globally for threshold.js (before threshold.js loads)
  window.removeLoadingScreen = removeLoadingScreen;

  // Show critical load error using Swal2 (loaded in index.html before first.js)
  window.showCriticalLoadError = (title, text) => {
    clearTimeout(timeoutWarningTimer);
    initProgress.stopProgressAnimation();
    if (typeof Swal !== "undefined") {
      Swal.fire({
        allowOutsideClick: false,
        icon: "error",
        title: title || "Loading Failed",
        text: text || "Please refresh the page to try again.",
        confirmButtonText: "Refresh",
      }).then(() => window.location.reload());
    }
  };

  // Remove loading screen when ready for UI (compatibility page)
  window.addEventListener("threshold-ready-for-ui", () => {
    removeLoadingScreen(); // Delegates to extracted function
  });
};

// Run immediately
document.addEventListener("DOMContentLoaded", setupInitialUI);

// Add some CSS for the loading screen
const style = document.createElement("style");
style.textContent = `
    body, html {
        margin: 0;
        padding: 0;
    }

    .loading-container {
        position: fixed;
        top: 0;
        left: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: opacity 0.4s ease;
        padding: 0;
        margin: 0;
        height: 100vh;
        width: 100vw;
        background: white;
        z-index: 10000;
    }

    .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        width: 400px;
        max-width: 90vw;
        padding: 20px;
    }

    .loading-spinner {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }

    .loading-text {
        font-size: 18px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #333;
        font-weight: 500;
    }

    .progress-bar {
        width: 100%;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #3498db;
        width: 0%;
        transition: width 0.3s ease;
    }

    .progress-percent {
        font-size: 14px;
        color: #666;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .progress-step {
        font-size: 12px;
        color: #999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        min-height: 16px;
    }

    .timeout-message {
        font-size: 14px;
        color: #666;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 400;
        text-align: center;
    }

    .reload-button {
        background: #3498db;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 4px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s ease;
    }

    .reload-button:hover {
        background: #2980b9;
    }

    .reload-button:active {
        background: #1f618d;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .fade-out {
        opacity: 0;
    }

    /* Center-align Swal2 modal title and content for consistent alignment */
    .swal2-title,
    .swal2-html-container {
        text-align: center !important;
    }
`;
document.head.appendChild(style);

// Export things that threshold.js might need
export { setupInitialUI };
