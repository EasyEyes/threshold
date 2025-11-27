/**
 * Class to track initialization progress
 */
export class InitializationProgress {
  constructor() {
    this.currentPercentage = 0;
    this.listeners = [];
    this.progressIntervalId = null;
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
      callback(this.currentPercentage);
    });

    // Also dispatch custom event for cross-module communication
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("threshold-init-progress", {
          detail: {
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
    this.currentPercentage = 0;
  }
}

// Create a singleton instance
export const initProgress = new InitializationProgress();
