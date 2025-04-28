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
        <div class="loading-spinner"></div>
    `;
  document.body.appendChild(loadingElement);

  // Listen for main bundle load
  window.addEventListener("threshold-loaded", () => {
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
    }

    .loading-spinner {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
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
