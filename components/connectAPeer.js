import { QRSkipResponse } from "./compatibilityCheck";
import { formatLineBreak } from "./compatibilityCheckHelpers";
import {
  keypad,
  rc,
  timeoutNewPhoneSec,
  needPhoneSurvey,
  needComputerSurveyBool,
} from "./global";
import { readi18nPhrases } from "./readPhrases";
import { quitPsychoJS } from "./lifetime";
import { psychoJS } from "./globalPsychoJS";
import { showExperimentEnding } from "./forms";
import { isProlificExperiment } from "./externalServices.ts";
import { paramReader } from "../threshold";
import { KeypadHandler, keypadRequiredInExperiment } from "./keypad";
import Swal from "sweetalert2";

export const ConnectionManagerDisplay = {};
export const qrLink = { value: "" };
export const CompatibilityPeer = {};
export const SoundCalibrationPeer = {};
export const ConnectionManager = {};

try {
  const { ExperimentPeer } = ConnectAPeer;

  ConnectionManager.handler = new ExperimentPeer({
    hostPageUrl: "https://connection-manager-14ac1ef82705.herokuapp.com",
    // hostPageUrl: "http://localhost:3000",
    targetDOMElement: document.body,
  });

  await ConnectionManager.handler.init();
} catch (error) {
  console.log("error", error);
}

export const getConnectionManagerDisplay = async (refreshPeer = false) => {
  try {
    if (refreshPeer) {
      await ConnectionManager.handler.close();
      await ConnectionManager.handler.init();
    }
    qrLink.value = await ConnectionManager.handler.getQRLink();
    // Get shortened URL
    const url = "https://api.short.io/links/public";
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "pk_fysLKGj3legZz4XZ",
      },
      body: JSON.stringify({
        domain: "listeners.link",
        originalURL: qrLink.value,
      }),
    };
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      qrLink.value = data.shortURL;
    } catch (error) {
      console.log("error", error);
    }

    const container = await ConnectionManager.handler.getQRContainer(
      formatLineBreak(
        readi18nPhrases("RC_skipQR_Explanation", rc.language.value),
        readi18nPhrases("RC_checkInternetConnection", rc.language.value),
      )
        .replace("[[xxx]]", `<b>${qrLink.value}</b>`)
        .replace("[[XXX]]", `<b>${qrLink.value}</b>`),
      // readi18nPhrases("RC_PrivacyAssurancePolicyButton", rc.language.value),
      readi18nPhrases("RC_cantConnectPhone_Button", rc.language.value),
      readi18nPhrases("RC_preferNotToConnectPhone_Button", rc.language.value),
      readi18nPhrases("RC_noSmartphone_Button", rc.language.value),
    );
    const checkConnection = document.createElement("a");
    checkConnection.id = "check-connection";
    checkConnection.href = "#";
    checkConnection.innerHTML = readi18nPhrases(
      "RC_checkInternetConnection",
      rc.language.value,
    );
    checkConnection.addEventListener("click", function (event) {
      event.preventDefault();
      createAndShowPopup(rc.language.value);
    });
    container.explanation
      .querySelector("a#check-connection")
      .replaceWith(checkConnection);
    //qrContainer, cantReadButton, preferNotToReadButton, noSmartphoneButton, explanation
    ConnectionManagerDisplay.qrContainer = container.qrContainer;
    ConnectionManagerDisplay.qrContainer.id = "connection-manager-qr-container";
    // TBD: UNCOMMENT privacy button
    // ConnectionManagerDisplay.privacyButton = container.privacyButton;
    // ConnectionManagerDisplay.privacyButton.id =
    //   "connection-manager-privacy-button";
    ConnectionManagerDisplay.cantReadButton = container.cantReadButton;
    ConnectionManagerDisplay.cantReadButton.id =
      "connection-manager-cant-read-button";
    ConnectionManagerDisplay.preferNotToReadButton =
      container.preferNotToReadButton;
    ConnectionManagerDisplay.preferNotToReadButton.id =
      "connection-manager-prefer-not-to-read-button";
    ConnectionManagerDisplay.noSmartphoneButton = container.noSmartphoneButton;
    ConnectionManagerDisplay.noSmartphoneButton.id =
      "connection-manager-no-smartphone-button";
    ConnectionManagerDisplay.explanation = container.explanation;
    ConnectionManagerDisplay.explanation.id = "connection-manager-explanation";
    //add event listeners

    // TBD: UNCOMMENT privacy button
    // ConnectionManagerDisplay.privacyButton.addEventListener(
    //   "click",
    //   async () => {
    //     Swal.fire({
    //       html: `<div style="text-align: left;">${readi18nPhrases("RC_phoneAndMicrophonePrivacy", rc.language.value)}</div>`,
    //       showCancelButton: true,
    //       confirmButtonText: readi18nPhrases("RC_ok", rc.language.value),
    //       cancelButtonText: readi18nPhrases("RC_Quit", rc.language.value),
    //     });
    //   }
    // );

    ConnectionManagerDisplay.cantReadButton.addEventListener(
      "click",
      async () => {
        if (needPhoneSurvey.current || needComputerSurveyBool.current) {
          QRSkipResponse.QRCantBool = true;
          psychoJS.experiment.addData("QRConnect", "✖Cannot");
          psychoJS.experiment.nextEntry();
          // Do not quit or show ending, just proceed TBD what does porceeding mean in surveys
        } else {
          Swal.fire({
            html: `<div style="text-align: left;">${readi18nPhrases(
              "RC_cantConnectPhoneExplanation",
              rc.language.value,
            )}</div>`,
            showCancelButton: true,
            confirmButtonText: readi18nPhrases("RC_ok", rc.language.value),
            cancelButtonText: readi18nPhrases("RC_Quit", rc.language.value),
            focusConfirm: false,
            customClass: {
              container: "no-background",
            },
            width: "42%",
          }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
              QRSkipResponse.QRCantBool = true;
              psychoJS.experiment.addData("QRConnect", "✖Cannot");
              psychoJS.experiment.nextEntry();
              quitPsychoJS(
                "",
                false,
                paramReader,
                !isProlificExperiment(),
                false,
              );
              showExperimentEnding(
                true,
                isProlificExperiment(),
                rc.language.value,
              );
            }
            // If 'Ok' is clicked, do nothing (just close the popup)
          });
        }
      },
    );

    ConnectionManagerDisplay.preferNotToReadButton.addEventListener(
      "click",
      async () => {
        if (needPhoneSurvey.current || needComputerSurveyBool.current) {
          QRSkipResponse.QRPreferNotToBool = true;
          psychoJS.experiment.addData("QRConnect", "✖PreferNot");
          psychoJS.experiment.nextEntry();
          // Do not quit or show ending, just proceed TBD what does porceeding mean in surveys
        } else {
          Swal.fire({
            html: `<div style="text-align: left;">${readi18nPhrases(
              "RC_preferNotToConnectPhoneExplanation",
              rc.language.value,
            )}</div>`,
            showCancelButton: true,
            confirmButtonText: readi18nPhrases("RC_ok", rc.language.value),
            cancelButtonText: readi18nPhrases("RC_Quit", rc.language.value),
            focusConfirm: false,
            customClass: {
              container: "no-background",
            },
            width: "42%",
          }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
              QRSkipResponse.QRPreferNotToBool = true;
              psychoJS.experiment.addData("QRConnect", "✖PreferNot");
              psychoJS.experiment.nextEntry();
              quitPsychoJS(
                "",
                false,
                paramReader,
                !isProlificExperiment(),
                false,
              );
              showExperimentEnding(
                true,
                isProlificExperiment(),
                rc.language.value,
              );
            }
            // If 'Ok' is clicked, do nothing (just close the popup)
          });
        }
      },
    );

    ConnectionManagerDisplay.noSmartphoneButton.addEventListener(
      "click",
      async () => {
        QRSkipResponse.QRNoSmartphoneBool = true;
        psychoJS.experiment.addData("QRConnect", "✖NoPhone");
        psychoJS.experiment.nextEntry();
        quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
        showExperimentEnding(true, isProlificExperiment(), rc.language.value);
      },
    );
  } catch (error) {
    console.log("error", error);
  }
};

export const handleLanguageChangeForConnectionManagerDisplay = () => {
  //just change the text of the buttons. search by id
  const cantReadButton = document.getElementById(
    "connection-manager-cant-read-button",
  );
  const preferNotToReadButton = document.getElementById(
    "connection-manager-prefer-not-to-read-button",
  );
  const noSmartphoneButton = document.getElementById(
    "connection-manager-no-smartphone-button",
  );
  const explanation = document.getElementById("connection-manager-explanation");

  if (cantReadButton) {
    cantReadButton.innerHTML = readi18nPhrases(
      "RC_cantConnectPhone_Button",
      rc.language.value,
    );
  }
  if (preferNotToReadButton) {
    preferNotToReadButton.innerHTML = readi18nPhrases(
      "RC_preferNotToConnectPhone_Button",
      rc.language.value,
    );
  }

  if (noSmartphoneButton) {
    noSmartphoneButton.innerHTML = readi18nPhrases(
      "RC_noSmartphone_Button",
      rc.language.value,
    );
  }

  if (explanation) {
    explanation.innerHTML = formatLineBreak(
      readi18nPhrases("RC_skipQR_Explanation", rc.language.value),
      readi18nPhrases("RC_checkInternetConnection", rc.language.value),
    )
      .replace("[[xxx]]", `<b>${qrLink.value}</b>`)
      .replace("[[XXX]]", `<b>${qrLink.value}</b>`);
  }
};

await getConnectionManagerDisplay(false);

/**
 * Initializes and registers all submodules with the ConnectionManager
 */
export async function initializeAndRegisterSubmodules() {
  try {
    // Initialize compatibility peer
    CompatibilityPeer.handler = new EasyEyesPeer.ExperimentPeer({
      text: readi18nPhrases("RC_smartphoneOkThanks", rc.language.value),
      timeout: timeoutNewPhoneSec.current,
    });
    ConnectionManager.handler.registerSubmodule(CompatibilityPeer.handler);

    // Initialize sound calibration
    SoundCalibrationPeer.handler = speakerCalibrator.Speaker;
    ConnectionManager.handler.registerSubmodule(SoundCalibrationPeer.handler);

    keypad.handler = new KeypadHandler(paramReader);
    // Initialize keypad
    if (keypadRequiredInExperiment(paramReader)) {
      ConnectionManager.handler.registerSubmodule(keypad.handler);
    }
  } catch (error) {
    console.log("error", error);
  }
}

export function convertAsterisksToList(content) {
  // turn every "* …<br>" (or "* …end-of-string") into a <li>…</li>
  let result = content.replace(/\* (.*?)(<br>|$)/g, "<li>$1</li>");

  // if you somehow ended up with an empty <li></li> at the very end, strip it out
  result = result.replace(/(<li>)(<\/li>)\s*$/, "");

  // insert the opening <ul> right before the very first <li>
  result = result.replace("<li>", '<ul style="padding-left:40px"><br><li>');

  // look for “</li>” followed (possibly) by whitespace or a <br>
  // and then a digit+period (e.g. “6.”). When you see that, close the </ul> just before the “6.”
  result = result.replace(/<\/li>\s*(?:<br>)?\s*(\d+\.)/, "</li></ul>$1");

  return result;
}
const createAndShowPopup = () => {
  Swal.fire({
    html: `
    <div style="text-align: left;"> 
    ${convertAsterisksToList(
      readi18nPhrases(
        "RC_NeedInternetConnectedPhone",
        rc.language.value,
      ).replace(/\n/g, "<br>"),
    )}
    </div>
      <div class="col-3" style="margin-top:10px;">
        <button id="okaybtn" class="btn btn-lg btn-dark">
          ${readi18nPhrases("EE_ok", rc.language.value)}
        </button>
      </div>`,
    showConfirmButton: false,
    position: "bottom",
    width: "40%",
    customClass: {
      container: "no-background",
    },
    showClass: {
      popup: "fade-in",
    },
    hideClass: {
      popup: "",
    },
    didOpen: () => {
      const okayBtn = document.getElementById("okaybtn");
      okayBtn.style.display = "flex";
      okayBtn.addEventListener("click", () => {
        Swal.close(); // Close the Swal popup
      });
    },
  });
};
