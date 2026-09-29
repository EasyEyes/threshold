const cleanups = new Set<() => void>();

/** Register page cleanup separately from its successful Proceed callback. */
export function onStudyTermination(cleanup: () => void) {
  cleanups.add(cleanup);
  return () => {
    cleanups.delete(cleanup);
  };
}

export function disposeStudyInteractions() {
  const pending = [...cleanups];
  cleanups.clear();
  for (const cleanup of pending) {
    try {
      cleanup();
    } catch (error) {
      console.warn("Study interaction cleanup failed", error);
    }
  }
}
