export const showConsentForm = async (formName) => {
  // reset all form outputs
  hideAllForms();

  const formNameTokens = formName.split(".");
  const formNameExt = formNameTokens[formNameTokens.length - 1].toLowerCase();

  // show form container
  const formHolderEl = document.getElementById("form-container");
  formHolderEl.style.zIndex = 1000005;
  formHolderEl.style.display = "block";

  // show form inputs
  const formInputEl = document.getElementById("consent-form-input");
  formInputEl.style.display = "block";
  formInputEl.style.zIndex = 1000005;

  if (formNameExt == "pdf") {
    const pdfForm = document.getElementById("form-pdf");
    pdfForm.style.zIndex = 1000005;
    pdfForm.style.display = "block";
    pdfForm.setAttribute("src", `forms/${formName}`);
  } else if (formNameExt == "md") {
    const response = await axios.get(`/forms/${formName}`);
    const mdForm = document.getElementById("form-md");
    mdForm.style.display = "block";
    mdForm.innerHTML = marked.parse(response.data);
  }
};

export const showDebriefForm = async (formName) => {
  // reset all form outputs
  hideAllForms();

  const formNameTokens = formName.split(".");
  const formNameExt = formNameTokens[formNameTokens.length - 1].toLowerCase();

  // show form container
  const formHolderEl = document.getElementById("form-container");
  formHolderEl.style.zIndex = 1000005;
  formHolderEl.style.display = "block";

  // show form inputs
  const formInputEl = document.getElementById("debrief-form-input");
  formInputEl.style.display = "block";
  formInputEl.style.zIndex = 1000005;

  if (formNameExt == "pdf") {
    const pdfForm = document.getElementById("form-pdf");
    pdfForm.style.zIndex = 1000005;
    pdfForm.style.display = "block";
    pdfForm.setAttribute("src", `forms/${formName}`);
  } else if (formNameExt == "md") {
    const response = await axios.get(`/forms/${formName}`);
    const mdForm = document.getElementById("form-md");
    mdForm.style.display = "block";
    mdForm.innerHTML = marked.parse(response.data);
  }
};

export const hideAllForms = () => {
  // hide all form types
  document.getElementById("form-pdf").style.display = "none";
  document.getElementById("form-md").style.display = "none";

  // hide form inputs
  let consentFormInputEl = document.getElementById("consent-form-input");
  consentFormInputEl.style.display = "none";
  consentFormInputEl.style.zIndex = 0;

  consentFormInputEl = document.getElementById("debrief-form-input");
  consentFormInputEl.style.display = "none";
  consentFormInputEl.style.zIndex = 0;

  // hide form container
  const formHolderEl = document.getElementById("form-container");
  formHolderEl.style.zIndex = 0;
  formHolderEl.style.display = "none";
};
