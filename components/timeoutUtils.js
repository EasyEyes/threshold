/**
 * Utility for wrapping promises with timeout functionality
 */

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message if timeout occurs
 * @returns {Promise} A promise that resolves/rejects with the original promise or timeout error
 */
export const withTimeout = (promise, timeoutMs, errorMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        const error = new Error(
          errorMessage || `Operation timed out after ${timeoutMs}ms`,
        );
        error.name = "TimeoutError";
        reject(error);
      }, timeoutMs),
    ),
  ]);
};

/**
 * Class to track initialization progress
 */
export class InitializationProgress {
  constructor() {
    this.currentStep = "";
    this.currentPercentage = 0;
    this.listeners = [];
    this.initStartTime = Date.now();
    this.progressIntervalId = null;
  }

  /**
   * Add a listener for progress updates
   * @param {Function} callback - Callback with (step, percentage) parameters
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Update progress and notify listeners
   * @param {string} step - Current step name
   * @param {number} percentage - Progress percentage (0-100)
   */
  updateProgress(step, percentage) {
    this.currentStep = step;
    this.currentPercentage = percentage;
    this.notifyListeners();
  }

  /**
   * Start progress animation for better UX
   * Gradually increases progress if not already at target
   */
  startProgressAnimation() {
    if (this.progressIntervalId) return; // Already running

    this.progressIntervalId = setInterval(() => {
      // Gradually increase progress between updates (but slower as we get higher)
      if (this.currentPercentage < 90) {
        const increment = Math.random() * (5 - 1) + 1; // Random 1-5% increment
        this.currentPercentage = Math.min(
          90,
          this.currentPercentage + increment,
        );
        this.notifyListeners();
      }
    }, 800); // Update every 800ms
  }

  /**
   * Stop progress animation
   */
  stopProgressAnimation() {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }
  }

  /**
   * Notify all listeners of progress update
   */
  notifyListeners() {
    this.listeners.forEach((callback) => {
      callback(this.currentStep, this.currentPercentage);
    });

    // Also dispatch custom event for cross-module communication
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("threshold-init-progress", {
          detail: {
            step: this.currentStep,
            percentage: Math.round(this.currentPercentage),
          },
        }),
      );
    }
  }

  /**
   * Reset progress
   */
  reset() {
    this.stopProgressAnimation();
    this.currentStep = "";
    this.currentPercentage = 0;
  }
}

// Create a singleton instance
export const initProgress = new InitializationProgress();
