export const BASE_DELAY_SEC = 0.2;
export const MAX_DELAY_SEC = 30;
export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const getRetryDelayMs = (attempt: number) => {
  const delaySec = Math.min(
    BASE_DELAY_SEC * Math.pow(1.75, attempt),
    MAX_DELAY_SEC,
  );
  return delaySec * 1000;
};
