/* ---------------------------- Remote Calibrator --------------------------- */
export const useRC = true;
// eslint-disable-next-line no-undef
export const rc = RemoteCalibrator; // Currently imported from HTML script tag
rc.init();

/* ------------------------------- Exp Configs ------------------------------ */
export let targetKind = { current: undefined };

/* --------------------------------- Reading -------------------------------- */
export const readingCorpusArchive = {};
export const readingWordListArchive = {};
export const readingWOrdFrequencyArchive = {};

export const readingUsedText = {};
export const readingThisBlockPages = []; // string[]
