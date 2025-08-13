import axios from "axios";
import { readi18nPhrases } from "./readPhrases";
import { rc } from "./global";

/**
 * returns true when user clicks "yes" on consent form
 * @param {ParamReader} reader used to read form names
 * @returns Promise<boolean> true if user gives consent, else false
 */
export const showForm = async (formName) => {
  // No form, just continue
  if (!formName) return true;

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    // if form name is invalid, continue experiment
    if (!(typeof formName === "string" && formName.length > 0)) resolve(false);

    // reset all form outputs
    hideForm();

    // get form name extension
    const formNameTokens = formName.split(".");
    const formNameExt = formNameTokens[formNameTokens.length - 1].toLowerCase();

    if (formNameExt == "pdf") {
      renderPDFForm(`forms/${formName}#toolbar=0&navpanes=0&scrollbar=0`);
    } else if (formNameExt == "md") {
      const response = await axios.get(`/forms/${formName}`);
      // eslint-disable-next-line no-undef
      renderMarkdownForm(marked.parse(response.data));
    }

    // when user gives consent
    document.getElementById("form-yes").addEventListener("click", (evt) => {
      resolve(true);
    });

    // when user declines consent
    document.getElementById("form-no").addEventListener("click", (evt) => {
      resolve(false);
    });
  });
};

export const hideForm = () => {
  // hide all form types
  document.getElementById("form-pdf")?.remove();
  document.getElementById("form-md")?.remove();

  document.getElementById("form-input")?.remove();

  // hide form container
  document.getElementById("form-container")?.remove();
};

const renderPDFForm = (src) => {
  // create wrapper El
  const formContainerEl = document.createElement("form");
  formContainerEl.id = "form-container";
  formContainerEl.style.display = "block";

  // create iframe for PDF
  const iframeEl = document.createElement("iframe");
  iframeEl.id = "form-pdf";
  // TODO Rewrite in .css file
  Object.assign(iframeEl.style, {
    width: "100%",
    height: "100%",
    scrolling: "auto",
    display: "block",
    zIndex: 1000005,
  });
  // iframeEl.setAttribute("width", "100%");
  // iframeEl.setAttribute("height", "100%");
  // iframeEl.setAttribute("scrolling", "auto");
  iframeEl.setAttribute("src", src);

  // input button wrapper
  const formInputContainerEl = document.createElement("div");
  formInputContainerEl.id = "form-input";
  formInputContainerEl.style.display = "block";
  formInputContainerEl.style.zIndex = 1000005;

  // yes button
  const yesBtnEl = document.createElement("button");
  yesBtnEl.id = "form-yes";
  yesBtnEl.classList.add("form-input-btn");
  yesBtnEl.innerHTML = readi18nPhrases("EE_Yes", rc.language.value);

  // no button
  const noBtnEl = document.createElement("button");
  noBtnEl.id = "form-no";
  noBtnEl.classList.add("form-input-btn");
  noBtnEl.innerHTML = readi18nPhrases("EE_No", rc.language.value);

  formInputContainerEl.appendChild(yesBtnEl);
  formInputContainerEl.appendChild(noBtnEl);

  // update DOM
  formContainerEl.appendChild(iframeEl);
  formContainerEl.appendChild(formInputContainerEl);
  document.body.appendChild(formContainerEl);
};

const renderMarkdownForm = (content) => {
  // create wrapper El
  // TODO Modularize buttons
  const formContainerEl = document.createElement("form");
  formContainerEl.setAttribute("id", "form-container");

  // create div for md
  const iframeEl = document.createElement("div");
  iframeEl.setAttribute("id", "form-md");
  iframeEl.style.zIndex = 1000005;
  iframeEl.innerHTML = content;

  /// input button wrapper
  const formInputContainerEl = document.createElement("div");
  formInputContainerEl.setAttribute("id", "form-input");
  formInputContainerEl.style.zIndex = 1000005;

  // yes button
  const yesBtnEl = document.createElement("button");
  yesBtnEl.setAttribute("id", "form-yes");
  yesBtnEl.classList.add("form-input-btn");

  // no button
  const noBtnEl = document.createElement("button");
  noBtnEl.setAttribute("id", "form-no");
  noBtnEl.classList.add("form-input-btn");

  formInputContainerEl.appendChild(yesBtnEl);
  formInputContainerEl.appendChild(noBtnEl);

  // update DOM
  formContainerEl.appendChild(formInputContainerEl);
  document.body.appendChild(formContainerEl);
};

/* -------------------------------------------------------------------------- */

/**
 * Shows follow-up questions when user says "No" to debrief form
 * @param {string} language - Language code for internationalization
 * @returns Promise<{questions: string, consent: boolean}> - User's responses
 */
export const showDebriefFollowUp = async (language = "en-US") => {
  return new Promise((resolve) => {
    // Create container
    const followUpContainer = document.createElement("div");
    followUpContainer.id = "debrief-followup-container";
    followUpContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000010;
      overflow: hidden;
    `;

    // Create form
    const followUpForm = document.createElement("div");
    followUpForm.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    // First question
    const questionLabel = document.createElement("h3");
    questionLabel.textContent = readi18nPhrases(
      "EE_afterSayingNoToDebrief",
      language,
    );
    questionLabel.style.marginBottom = "15px";

    // Text area for open-ended response
    const questionTextArea = document.createElement("textarea");
    questionTextArea.id = "debrief-questions-textarea";
    questionTextArea.style.cssText = `
      width: 100%;
      height: 150px;
      padding: 10px;
      border: 2px solid #ccc;
      border-radius: 5px;
      font-size: 16px;
      font-family: Arial, sans-serif;
      resize: vertical;
      margin-bottom: 25px;
    `;
    questionTextArea.placeholder = readi18nPhrases(
      "EE_afterSayingNoToDebriefTextboxPlaceholder",
      language,
    );

    // Second question
    const consentLabel = document.createElement("h3");
    consentLabel.textContent = readi18nPhrases("EE_askConsentAgain", language);
    consentLabel.style.marginBottom = "15px";

    // Radio buttons container
    const radioContainer = document.createElement("div");
    radioContainer.style.cssText = `
      margin-bottom: 25px;
      display: flex;
      justify-content: center;
      gap: 40px;
      max-width: 100%;
      flex-wrap: wrap;
    `;

    // Yes radio button
    const yesRadio = document.createElement("input");
    yesRadio.type = "radio";
    yesRadio.name = "consent-again";
    yesRadio.value = "yes";
    yesRadio.id = "consent-yes";
    yesRadio.style.cssText = `
      width: 20px;
      height: 20px;
      margin: 0;
      cursor: pointer;
    `;

    const yesLabel = document.createElement("label");
    yesLabel.htmlFor = "consent-yes";
    yesLabel.textContent = readi18nPhrases("EE_Yes", language);
    yesLabel.style.cssText = `
      cursor: pointer;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
      text-align: center;
      color: #333;
    `;

    // No radio button
    const noRadio = document.createElement("input");
    noRadio.type = "radio";
    noRadio.name = "consent-again";
    noRadio.value = "no";
    noRadio.id = "consent-no";
    noRadio.style.cssText = `
      width: 20px;
      height: 20px;
      margin: 0;
      cursor: pointer;
    `;

    const noLabel = document.createElement("label");
    noLabel.htmlFor = "consent-no";
    noLabel.textContent = readi18nPhrases("EE_No", language);
    noLabel.style.cssText = `
      cursor: pointer;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
      text-align: center;
      color: #333;
    `;

    // Submit button
    const submitButton = document.createElement("button");
    submitButton.textContent = "Submit";
    submitButton.classList.add("btn");
    submitButton.classList.add("btn-success");
    submitButton.setAttribute("disabled", true);

    // Function to update submit button state
    const updateSubmitButtonState = () => {
      const consentRadio = document.querySelector(
        'input[name="consent-again"]:checked',
      );
      const isAnswered = consentRadio !== null;

      if (isAnswered) {
        submitButton.removeAttribute("disabled");
        submitButton.setAttribute("active", true);
      } else {
        submitButton.removeAttribute("active");
        submitButton.setAttribute("disabled", true);
      }
    };

    // Assemble the form
    const yesContainer = document.createElement("div");
    yesContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
      max-width: 120px;
    `;
    yesContainer.appendChild(yesLabel);
    yesContainer.appendChild(yesRadio);

    const noContainer = document.createElement("div");
    noContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
      max-width: 120px;
    `;
    noContainer.appendChild(noLabel);
    noContainer.appendChild(noRadio);

    // Add event listeners to radio buttons to update submit button state
    yesRadio.addEventListener("change", updateSubmitButtonState);
    noRadio.addEventListener("change", updateSubmitButtonState);

    radioContainer.appendChild(yesContainer);
    radioContainer.appendChild(noContainer);

    followUpForm.appendChild(questionLabel);
    followUpForm.appendChild(questionTextArea);
    followUpForm.appendChild(consentLabel);
    followUpForm.appendChild(radioContainer);
    followUpForm.appendChild(submitButton);

    followUpContainer.appendChild(followUpForm);
    document.body.appendChild(followUpContainer);

    // Handle submit
    submitButton.addEventListener("click", (e) => {
      const consentRadio = document.querySelector(
        'input[name="consent-again"]:checked',
      );

      // Prevent submission if no answer is selected
      if (!consentRadio) {
        e.preventDefault();
        return;
      }

      const questionsText = questionTextArea.value.trim();
      const consentValue = consentRadio.value === "yes";

      // Remove the form
      followUpContainer.remove();

      // Resolve with the responses
      resolve({
        questions: questionsText,
        consent: consentValue,
      });
    });

    // Focus on textarea
    questionTextArea.focus();
  });
};

// If the consent form were denied... Show the ending directly

export const showExperimentEnding = (newEnding = true) => {
  // ? Do we really need this function?
  // Why not do through PsychoJS or other interfaces?
  // Fixed for old code by @svr8
  let endingText;
  if (newEnding) endingText = document.createElement("div");
  else endingText = document.getElementById("exp-end-text");

  endingText.innerHTML = "Thank you. The experiment has ended."; // TODO i18n
  endingText.id = "exp-end-text";
  document.body.appendChild(endingText);
  endingText.style.visibility = "visible";
};
