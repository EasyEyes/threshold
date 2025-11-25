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
            percentage: this.currentPercentage,
          },
        }),
      );
    }
  }

  /**
   * Reset progress
   */
  reset() {
    this.currentStep = "";
    this.currentPercentage = 0;
  }
}

// Create a singleton instance
export const initProgress = new InitializationProgress();
