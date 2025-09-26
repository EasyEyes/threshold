import axios from "axios";
import { readi18nPhrases } from "./readPhrases";
import { rc, status } from "./global";
import { paramReader } from "../threshold";

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
  document.getElementById("form-payment-info")?.remove();

  // hide form container
  document.getElementById("form-container")?.remove();
};

const createPaymentInfoElement = () => {
  try {
    // read payment parameters
    const currencySymbol =
      paramReader.read("_online2PayCurrencySymbol")[0] || "$";
    const payPerHour = parseFloat(
      paramReader.read("_online2PayPerHour")[0] || 0,
    );
    const pay = parseFloat(paramReader.read("_online2Pay")[0] || 0);
    const minutes = Math.round(
      parseFloat(paramReader.read("_online2Minutes")[0] || 0),
    );

    // calculate final payment amount
    let paymentAmount;
    if (payPerHour > 0) {
      paymentAmount = ((payPerHour * minutes) / 60).toFixed(2);
    } else {
      paymentAmount = pay.toFixed(2);
    }

    // get the localized text template
    const template = readi18nPhrases(
      "EE_BelowConsentReportPayAndDuration",
      rc.language.value,
    );

    // replace placeholders with actual values
    const finalText = template
      .replace(/ⓊⓊⓊ/g, currencySymbol)
      .replace(/𝟙𝟙𝟙/g, paymentAmount)
      .replace(/𝟚𝟚𝟚/g, minutes.toString());

    // Create the payment info element
    const paymentInfoEl = document.createElement("div");
    paymentInfoEl.id = "form-payment-info";
    paymentInfoEl.innerHTML = finalText;

    Object.assign(paymentInfoEl.style, {
      fontSize: "16pt",
      textAlign: "center",
      padding: "15px 20px",
      marginTop: "10px",
      marginBottom: "15px",
      zIndex: 0,
    });

    return paymentInfoEl;
  } catch (error) {
    console.warn("Could not create payment info element:", error);
    return null;
  }
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

  // Create and add payment info element
  const paymentInfoEl = createPaymentInfoElement();

  // update DOM
  formContainerEl.appendChild(iframeEl);
  if (paymentInfoEl) {
    formContainerEl.appendChild(paymentInfoEl);
  }
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
  yesBtnEl.innerHTML = readi18nPhrases("EE_Yes", rc.language.value);

  // no button
  const noBtnEl = document.createElement("button");
  noBtnEl.setAttribute("id", "form-no");
  noBtnEl.classList.add("form-input-btn");
  noBtnEl.innerHTML = readi18nPhrases("EE_No", rc.language.value);

  formInputContainerEl.appendChild(yesBtnEl);
  formInputContainerEl.appendChild(noBtnEl);

  // create and add payment info element
  const paymentInfoEl = createPaymentInfoElement();

  // update DOM
  formContainerEl.appendChild(iframeEl);
  if (paymentInfoEl) {
    formContainerEl.appendChild(paymentInfoEl);
  }
  formContainerEl.appendChild(formInputContainerEl);
  document.body.appendChild(formContainerEl);
};

/* -------------------------------------------------------------------------- */

/**
 * Shows follow-up questions when user says "No" to debrief form
 * @param {string} language - Language code for internationalization
 * @returns Promise<{questions: string, consent: boolean}> - User's responses
 */
export const showDebriefFollowUp = async (language = "en") => {
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

    // Submit button
    const submitButton = document.createElement("button");
    submitButton.textContent = "Submit";
    submitButton.classList.add("btn");
    submitButton.classList.add("btn-success");
    submitButton.setAttribute("active", true);

    // Second question (only shown if status.consentGiven)
    let consentLabel,
      radioContainer,
      yesContainer,
      noContainer,
      yesRadio,
      yesLabel,
      noRadio,
      noLabel;
    if (status.consentGiven) {
      consentLabel = document.createElement("h3");
      consentLabel.textContent = readi18nPhrases(
        "EE_askConsentAgain",
        language,
      );
      consentLabel.style.marginBottom = "15px";

      // Radio buttons container
      radioContainer = document.createElement("div");
      radioContainer.style.cssText = `
        margin-bottom: 25px;
        display: flex;
        justify-content: center;
        gap: 40px;
        max-width: 100%;
        flex-wrap: wrap;
      `;

      // Yes radio button
      yesRadio = document.createElement("input");
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

      yesLabel = document.createElement("label");
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
      noRadio = document.createElement("input");
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

      noLabel = document.createElement("label");
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

      yesContainer = document.createElement("div");
      yesContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 80px;
        max-width: 120px;
      `;
      yesContainer.appendChild(yesLabel);
      yesContainer.appendChild(yesRadio);

      noContainer = document.createElement("div");
      noContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 80px;
        max-width: 120px;
      `;
      noContainer.appendChild(noLabel);
      noContainer.appendChild(noRadio);

      radioContainer.appendChild(yesContainer);
      radioContainer.appendChild(noContainer);

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
      // Add event listeners to radio buttons to update submit button state
      yesRadio.addEventListener("change", updateSubmitButtonState);
      noRadio.addEventListener("change", updateSubmitButtonState);
      updateSubmitButtonState(); // initial state, ie remove green from button if we need to get secondary consent
    }

    // Assemble the form
    followUpForm.appendChild(questionLabel);
    followUpForm.appendChild(questionTextArea);
    if (status.consentGiven) {
      followUpForm.appendChild(consentLabel);
      followUpForm.appendChild(radioContainer);
    }
    followUpForm.appendChild(submitButton);

    followUpContainer.appendChild(followUpForm);
    document.body.appendChild(followUpContainer);

    // Handle submit
    submitButton.addEventListener("click", (e) => {
      const consentRadio = document.querySelector(
        'input[name="consent-again"]:checked',
      );

      // Prevent submission if no answer is selected
      if (!consentRadio && status.consentGiven) {
        e.preventDefault();
        return;
      }

      const questionsText = questionTextArea.value.trim();
      const consentValue = status.consentGiven
        ? consentRadio.value === "yes"
        : undefined;

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
