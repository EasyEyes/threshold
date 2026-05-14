// Import only what's needed for initial page rendering
import { initProgress } from "./components/timeoutUtils.js";
import * as sentry from "./components/sentry";

// Load i18n asynchronously (don't block spinner display)
const loadI18n = async () => {
  const i18nModule = await import("./components/i18n.js");
  return i18nModule.phrases;
};

// Initial UI setup function - show spinner immediately
const setupInitialUI = () => {
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

  // Lazy-load i18n and update text elements once available
  loadI18n()
    .then((phrases) => {
      const el = experimentLanguage; // It is loaded in the index.html
      const lang = Object.keys(phrases.EE_languageNameEnglish).find(
        (key) => phrases.EE_languageNameEnglish[key] === el,
      );
      if (lang) {
        // Update text elements (DOM already has them, just populate)
        const loadingText = loadingElement.querySelector(".loading-text");
        if (loadingText) {
          loadingText.textContent = phrases.RC_LoadingStudy[lang];
        }
        const timeoutMessage = document.getElementById("timeoutMessage");
        if (timeoutMessage) {
          timeoutMessage.textContent =
            phrases.RC_LoadingStudyTakingLonger[lang];
        }
        const reloadButton = document.getElementById("reloadButton");
        if (reloadButton) {
          reloadButton.textContent = phrases.RC_ReloadStudyButton[lang];
        }
      }
    })
    .catch((err) => {
      console.warn("Failed to load i18n:", err);
      // Fallback text in case i18n fails
      const loadingText = loadingElement.querySelector(".loading-text");
      if (loadingText) {
        loadingText.textContent = "Loading Study...";
      }
    });

  // Setup timeout warning and reload button (10 seconds)
  const timeoutWarningTimer = setTimeout(() => {
    const timeoutMessage = document.getElementById("timeoutMessage");
    const reloadButton = document.getElementById("reloadButton");
    if (loadingElement.parentNode) {
      if (timeoutMessage) {
        timeoutMessage.style.display = "block";
      }
      if (reloadButton) {
        reloadButton.style.display = "block";
      }
    }
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
