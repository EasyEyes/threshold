export const buildSwitch = (rc) => {
  const langPickerParent = document.getElementById("rc-language");
  let langInner =
    '<label for="lang" id="rc-language-label">This experiment is available in multiple languages: </label><select name="lang" id="lang-picker">';
  for (let lang of rc.supportedLanguages) {
    langInner += `<option value="${lang.language}">${lang.languageNameNative}</option>`;
  }
  langInner += "</select>";
  langPickerParent.innerHTML = langInner;

  document.querySelector("#lang-picker").onchange = (e) => {
    rc.newLanguage(document.querySelector("#lang-picker").value);
    rc.resetPanel();
  };
};

export const removeSwitch = () => {
  document
    .getElementById("rc-language")
    .removeChild(document.querySelector("#lang-picker"));
};
