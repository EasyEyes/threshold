# Local media preload test

The participant Vite server substitutes the sibling remote-calibrator/lib/RemoteCalibrator.min.js for the CDN script, including generated example pages. Restart Vite after this change. No publication is required for local testing.

1. In remote-calibrator, run `npm run build` after editing its source.
2. In website/docs/experiment/threshold, use the existing `npm start` example workflow (or `npx vite --host 127.0.0.1`). Open a compiled example with the required media.
3. Use a fresh page/browser cache and Network throttling. Complete Device Compatibility. The media-loading screen must appear before consent; required files must finish before proceeding.
4. Test calibrateDistanceBool TRUE and FALSE, phrase-linked videos, showImage, image folders, audio target/masker folders, and target sound lists. Duplicate URLs should download once.
5. Block one media request: loading must stop with Try again. Unblock it and retry; completed files must not download again.
6. After media loading, block the media hosts/paths and navigate calibration instructions and media blocks. No media or model requests should occur. Studies with trackDistance, measureDistance or trackGaze also load their tracking models (FaceMesh, hand detector) on the loading screen; live STT and sound-calibration services remain network-dependent.

Focused checks:

- `node --test tests/mediaPreload.test.mjs` in threshold
- `node --test test/instructionMediaManifest.test.mjs` in remote-calibrator

Downloads use three workers, complete blobs retained in memory, and an inactivity timeout. Remaining time is an approximate estimate from observed bytes, transfer speed and known/observed file sizes. Retry preserves completed files. Media decoding still happens in the existing consumers. Refreshing the page starts a new cache.

The new loading copy is currently English. A published build must also consume a release of RemoteCalibrator containing the new public preloading API; the Vite override is local only.

Calibration media is collected for the language selected during compatibility. Unused translations are excluded: malformed media links in another language cannot prevent an English study from starting. Select the language before loading; restart the study to change it afterward. A malformed URL in the selected instructions reports the phrase key and language for repair.

For the compression comparison, the local study defaults to the supplied `-C` URLs where a match exists. Open a fresh run with `?instruction-media=original` (or `&instruction-media=original` if the URL already has a query string) to compare the same selected media list with original files. In DevTools Network, use Disable cache and the same throttling for both runs. The updated list follows the configured calibration method, location and distance-check settings. Keep both possible hands available so a hand preference change can use the cached video.
