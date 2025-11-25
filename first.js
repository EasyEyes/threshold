// Import only what's needed for initial page rendering
import "./components/css/utils.css";
import "./components/css/custom.css";
import "./components/css/instructions.css";

// Initial UI setup function
const setupInitialUI = () => {
  // Create loading indicator
  const loadingElement = document.createElement("div");
  loadingElement.className = "loading-container";
  loadingElement.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading study...</div>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-percent" id="progressPercent">0%</div>
      <div class="progress-step" id="progressStep"></div>
      <div id="timeoutMessage" class="timeout-message" style="display: none;">
        This is taking longer than expected...
      </div>
      <button id="reloadButton" class="reload-button" style="display: none;">
        Reload Study
      </button>
    </div>
  `;
  document.body.appendChild(loadingElement);

  // Setup timeout warning (10 seconds)
  const timeoutWarningTimer = setTimeout(() => {
    const timeoutMessage = document.getElementById("timeoutMessage");
    if (timeoutMessage && loadingElement.parentNode) {
      timeoutMessage.style.display = "block";
    }
  }, 10000);

  // Setup reload button (15 seconds)
  const reloadButtonTimer = setTimeout(() => {
    const reloadButton = document.getElementById("reloadButton");
    if (reloadButton && loadingElement.parentNode) {
      reloadButton.style.display = "block";
    }
  }, 15000);

  // Reload button click handler
  const reloadButton = document.getElementById("reloadButton");
  if (reloadButton) {
    reloadButton.addEventListener("click", () => {
      window.location.reload();
    });
  }

  // Listen for initialization progress updates
  window.addEventListener("threshold-init-progress", (event) => {
    const { step, percentage } = event.detail;
    const progressFill = document.getElementById("progressFill");
    const progressPercent = document.getElementById("progressPercent");
    const progressStep = document.getElementById("progressStep");

    if (progressFill) {
      progressFill.style.width = percentage + "%";
    }
    if (progressPercent) {
      progressPercent.textContent = Math.round(percentage) + "%";
    }
    if (progressStep) {
      progressStep.textContent = step;
    }
  });

  // Listen for main bundle load
  window.addEventListener("threshold-loaded", () => {
    // Clear timeout timers
    clearTimeout(timeoutWarningTimer);
    clearTimeout(reloadButtonTimer);

    setTimeout(() => {
      loadingElement.remove();
    }, 400);
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
        max-width: 400px;
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
        color: #ff9800;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 500;
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
`;
document.head.appendChild(style);

// Export things that threshold.js might need
export { setupInitialUI };
