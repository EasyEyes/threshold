import axios from "axios";

/**
 * returns true when user clicks "yes" on consent form
 * @param {ParamReader} reader used to read form names
 * @returns Promise<boolean> true if user gives consent, else false
 */
export const showForm = async (formName) => {
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
  formContainerEl.setAttribute("id", "form-container");
  formContainerEl.style.display = "block";

  // create iframe for PDF
  const iframeEl = document.createElement("iframe");
  iframeEl.setAttribute("id", "form-pdf");
  iframeEl.setAttribute("width", "100%");
  iframeEl.setAttribute("height", "100%");
  iframeEl.setAttribute("scrolling", "auto");
  iframeEl.setAttribute("src", src);
  iframeEl.style.display = "block";
  iframeEl.style.zIndex = 1000005;

  // input button wrapper
  const formInputContainerEl = document.createElement("div");
  formInputContainerEl.setAttribute("id", "form-input");
  formInputContainerEl.style.display = "block";
  formInputContainerEl.style.zIndex = 1000005;

  // yes button
  const yesBtnEl = document.createElement("button");
  yesBtnEl.setAttribute("id", "form-yes");
  yesBtnEl.classList.add("form-input-btn");
  yesBtnEl.innerHTML = "YES";

  // no button
  const noBtnEl = document.createElement("button");
  noBtnEl.setAttribute("id", "form-no");
  noBtnEl.classList.add("form-input-btn");
  noBtnEl.innerHTML = "NO";

  formInputContainerEl.appendChild(yesBtnEl);
  formInputContainerEl.appendChild(noBtnEl);

  // update DOM
  formContainerEl.appendChild(iframeEl);
  formContainerEl.appendChild(formInputContainerEl);
  document.body.appendChild(formContainerEl);
};

const renderMarkdownForm = (content) => {
  // create wrapper El
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
