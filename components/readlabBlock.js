import { Scheduler } from "../psychojs/src/util";
import { phrases } from "./i18n";
import { thisExperimentInfo } from "./global";
import { psychoJS } from "./globalPsychoJS";
import {
  loadRecruitmentServiceConfig,
  recruitmentServiceData,
} from "./recruitmentService";

const READLAB_BASE_URL = "https://readlab.net/";
const READLAB_CONFIG_DEFAULT = "config/sample-experiment.csv";
const READLAB_BUTTON_ID = "readlab-continue-button";
const READLAB_OVERLAY_ID = "readlab-overlay";

const DEFAULT_TEXT_EN = {
  heading: "Continue on ReadLab",
  body:
    "For this part of the experiment, you will be redirected to ReadLab " +
    "(readlab.net) to complete a reading task. When you finish there, " +
    "ReadLab will bring you back here automatically. Please do not close " +
    "this tab. Click the button below to continue.",
  button: "Continue to ReadLab",
};

const phraseOrFallback = (phraseName, language, fallback) => {
  try {
    if (
      phrases &&
      Object.prototype.hasOwnProperty.call(phrases, phraseName) &&
      Object.prototype.hasOwnProperty.call(phrases[phraseName], language)
    ) {
      return phrases[phraseName][language];
    }
    if (
      phrases &&
      Object.prototype.hasOwnProperty.call(phrases, phraseName) &&
      Object.prototype.hasOwnProperty.call(phrases[phraseName], "en")
    ) {
      return phrases[phraseName]["en"];
    }
  } catch (_) {}
  return fallback;
};

const safeReadParam = (paramReader, name, blockOrCondition, fallback) => {
  try {
    if (!paramReader || typeof paramReader.read !== "function") return fallback;
    const value = paramReader.read(name, blockOrCondition);
    if (value === undefined || value === null || value === "") return fallback;
    return value;
  } catch (_) {
    return fallback;
  }
};

export const buildReadlabRedirectUrl = ({
  config = READLAB_CONFIG_DEFAULT,
  participantID = "",
  returnUrl = window.location.href,
} = {}) => {
  const params = new URLSearchParams();
  params.set("config", config);
  params.set("participant", participantID || "");
  const url = `${READLAB_BASE_URL}?${params.toString()}`;
  return `${url}&redirectUrl=${encodeURIComponent(returnUrl)}`;
};

export const buildEasyEyesReturnUrl = ({
  blockNumber,
  experimentFilename,
  participantID,
  prolificParticipantID,
  prolificStudyID,
  prolificSessionID,
  session,
} = {}) => {
  const u = new URL(window.location.href);
  u.searchParams.set("EE_resume", "1");
  if (typeof blockNumber === "number")
    u.searchParams.set("EE_block", String(blockNumber));
  if (experimentFilename) u.searchParams.set("EE_experiment", experimentFilename);
  if (participantID) u.searchParams.set("EE_participant", participantID);
  if (session) u.searchParams.set("EE_session", String(session));
  if (prolificParticipantID)
    u.searchParams.set("PROLIFIC_PID", prolificParticipantID);
  if (prolificStudyID) u.searchParams.set("STUDY_ID", prolificStudyID);
  if (prolificSessionID) u.searchParams.set("SESSION_ID", prolificSessionID);
  u.searchParams.set("EE_t", String(Date.now()));
  return u.toString();
};

const removeOverlay = () => {
  const existing = document.getElementById(READLAB_OVERLAY_ID);
  if (existing) existing.remove();
};

const renderReadlabOverlay = ({ heading, body, buttonLabel, onClick }) => {
  removeOverlay();

  const overlay = document.createElement("div");
  overlay.id = READLAB_OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "#ffffff",
    color: "#222",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "10000",
    padding: "2rem",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    maxWidth: "640px",
    width: "100%",
    textAlign: "left",
    lineHeight: "1.5",
  });

  const h1 = document.createElement("h1");
  h1.textContent = heading;
  Object.assign(h1.style, {
    fontSize: "1.75rem",
    margin: "0 0 1rem 0",
  });

  const p = document.createElement("p");
  p.textContent = body;
  Object.assign(p.style, {
    fontSize: "1.1rem",
    margin: "0 0 1.5rem 0",
  });

  const button = document.createElement("button");
  button.id = READLAB_BUTTON_ID;
  button.type = "button";
  Object.assign(button.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.25rem",
    fontSize: "1.05rem",
    fontWeight: "600",
    color: "#fff",
    background: "#1a73e8",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  });
  button.addEventListener("mouseenter", () => {
    button.style.background = "#1557b0";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "#1a73e8";
  });

  const label = document.createElement("span");
  label.textContent = buttonLabel;

  // External-link SVG icon
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("width", "18");
  icon.setAttribute("height", "18");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
    '<polyline points="15 3 21 3 21 9"/>' +
    '<line x1="10" y1="14" x2="21" y2="3"/>';

  button.appendChild(label);
  button.appendChild(icon);
  button.addEventListener("click", onClick);

  card.appendChild(h1);
  card.appendChild(p);
  card.appendChild(button);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
};

export const isReadlabResume = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("EE_resume") === "1";
  } catch (_) {
    return false;
  }
};

const restoreExperimentInfoFromResumeUrl = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    const eeParticipant = p.get("EE_participant");
    if (eeParticipant) {
      thisExperimentInfo.participant = eeParticipant;
      thisExperimentInfo.EasyEyesID = eeParticipant;
      thisExperimentInfo.PavloviaSessionID = eeParticipant;
    }
    const prolificPID = p.get("PROLIFIC_PID");
    const studyID = p.get("STUDY_ID");
    const sessionID = p.get("SESSION_ID");
    if (prolificPID) thisExperimentInfo.ProlificParticipantID = prolificPID;
    if (studyID) thisExperimentInfo.ProlificStudyID = studyID;
    if (sessionID) thisExperimentInfo.ProlificSessionID = sessionID;
  } catch (_) {}
};

const renderReadlabReturnEnding = ({
  heading,
  body,
  buttonLabel,
  buttonUrl,
}) => {
  removeOverlay();
  const overlay = document.createElement("div");
  overlay.id = READLAB_OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "#ffffff",
    color: "#222",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "10000",
    padding: "2rem",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    maxWidth: "640px",
    width: "100%",
    textAlign: "left",
    lineHeight: "1.5",
  });

  const h1 = document.createElement("h1");
  h1.textContent = heading;
  Object.assign(h1.style, { fontSize: "1.75rem", margin: "0 0 1rem 0" });

  const p = document.createElement("p");
  p.textContent = body;
  Object.assign(p.style, { fontSize: "1.1rem", margin: "0 0 1.5rem 0" });

  card.appendChild(h1);
  card.appendChild(p);

  if (buttonUrl) {
    const button = document.createElement("button");
    button.id = READLAB_BUTTON_ID;
    button.type = "button";
    button.textContent = buttonLabel;
    Object.assign(button.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1.25rem",
      fontSize: "1.05rem",
      fontWeight: "600",
      color: "#fff",
      background: "#1a73e8",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    });
    button.addEventListener("click", () => {
      button.disabled = true;
      window.location.href = buttonUrl;
    });
    card.appendChild(button);
  }

  overlay.appendChild(card);
  document.body.appendChild(overlay);
};

export const showReadlabReturnEnding = async (language = "en") => {
  restoreExperimentInfoFromResumeUrl();

  // Make sure recruitment service config is loaded so we know whether to
  // build a Prolific completion link.
  try {
    await loadRecruitmentServiceConfig();
  } catch (_) {}

  const heading = phraseOrFallback(
    "EE_readlabReturnHeading",
    language,
    "Thank you!",
  );
  const body = phraseOrFallback(
    "EE_readlabReturnBody",
    language,
    "Your responses have been recorded. The experiment is complete.",
  );

  let buttonLabel = "";
  let buttonUrl = "";
  if (
    recruitmentServiceData &&
    recruitmentServiceData.name === "Prolific" &&
    recruitmentServiceData.url
  ) {
    buttonLabel = phraseOrFallback(
      "EE_OKToTakeCompletionCodeToProlific",
      language,
      "Take me to Prolific to submit my completion code",
    );
    buttonUrl = recruitmentServiceData.url;
  }

  renderReadlabReturnEnding({ heading, body, buttonLabel, buttonUrl });
};

export const readlabBlockBegin = (snapshot, paramReader) => {
  return async function () {
    const blockN =
      snapshot && typeof snapshot.block === "number" ? snapshot.block + 1 : 1;
    const language = "en";

    const config = safeReadParam(
      paramReader,
      "readlabConfig",
      blockN,
      READLAB_CONFIG_DEFAULT,
    );
    const customBody = safeReadParam(
      paramReader,
      "readlabInstructions",
      blockN,
      "",
    );

    const heading = phraseOrFallback(
      "EE_readlabHeading",
      language,
      DEFAULT_TEXT_EN.heading,
    );
    const body =
      customBody ||
      phraseOrFallback("EE_readlabBody", language, DEFAULT_TEXT_EN.body);
    const buttonLabel = phraseOrFallback(
      "EE_readlabContinueButton",
      language,
      DEFAULT_TEXT_EN.button,
    );

    const returnUrl = buildEasyEyesReturnUrl({
      blockNumber: blockN,
      experimentFilename: thisExperimentInfo.experimentFilename,
      participantID: thisExperimentInfo.participant,
      prolificParticipantID: thisExperimentInfo.ProlificParticipantID,
      prolificStudyID: thisExperimentInfo.ProlificStudyID,
      prolificSessionID: thisExperimentInfo.ProlificSessionID,
      session: thisExperimentInfo.session,
    });

    const readlabUrl = buildReadlabRedirectUrl({
      config,
      participantID: thisExperimentInfo.participant || "",
      returnUrl,
    });

    renderReadlabOverlay({
      heading,
      body,
      buttonLabel,
      onClick: async () => {
        const btn = document.getElementById(READLAB_BUTTON_ID);
        if (btn) btn.disabled = true;

        // Mark this navigation as intentional so the saveDataOnWindowClose
        // beforeunload handler skips its preventDefault() (no "Leave site?"
        // browser dialog).
        window.__easyeyesIntentionalNavigation = true;

        // Remove PsychoJS's own beforeunload guard if present.
        try {
          if (psychoJS && psychoJS.beforeunloadCallback) {
            window.removeEventListener(
              "beforeunload",
              psychoJS.beforeunloadCallback,
            );
          }
        } catch (_) {}

        // Save any pending experiment data before unloading the page.
        try {
          if (psychoJS && psychoJS.experiment) {
            await psychoJS.experiment.save({ sync: true });
          }
        } catch (_) {}

        window.location.href = readlabUrl;
      },
    });

    return Scheduler.Event.NEXT;
  };
};

export const readlabBlockEachFrame = () => {
  return async function () {
    return Scheduler.Event.FLIP_REPEAT;
  };
};

export const readlabBlockEnd = () => {
  return async function () {
    removeOverlay();
    return Scheduler.Event.NEXT;
  };
};
