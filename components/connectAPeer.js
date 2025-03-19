import { QRSkipResponse } from "./compatibilityCheck";
import { formatLineBreak } from "./compatibilityCheckHelpers";
import { rc, timeoutNewPhoneSec } from "./global";
import { readi18nPhrases } from "./readPhrases";
import { quitPsychoJS } from "./lifetime";
import { psychoJS } from "./globalPsychoJS";
import { showExperimentEnding } from "./forms";
import { isProlificExperiment } from "./externalServices";
import { paramReader } from "../threshold";

const { ExperimentPeer } = ConnectAPeer;

console.log("...Connecting to connection-manager-14ac1ef82705.herokuapp.com");

export const ConnectionManager = new ExperimentPeer({
  hostPageUrl: "https://connection-manager-14ac1ef82705.herokuapp.com",
  targetDOMElement: document.body,
});

await ConnectionManager.init();

console.log("ConnectionManager", ConnectionManager);

export const ConnectionManagerDisplay = {};

export const qrLink = { value: "" };

export const getConnectionManagerDisplay = async (refreshPeer = false) => {
  try {
    if (refreshPeer) {
      await ConnectionManager.close();
      await ConnectionManager.init();
    }
    qrLink.value = await ConnectionManager.getQRLink();
    const container = await ConnectionManager.getQRContainer(
      formatLineBreak(
        readi18nPhrases("RC_skipQR_Explanation", rc.language.value),
        readi18nPhrases("RC_checkInternetConnection", rc.language.value),
      )
        .replace("xxx", `<b>${qrLink.value}</b>`)
        .replace("XXX", `<b>${qrLink.value}</b>`),
      readi18nPhrases("RC_cantReadQR_Button", rc.language.value),
      readi18nPhrases("RC_preferNotToReadQR_Button", rc.language.value),
      readi18nPhrases("RC_noSmartphone_Button", rc.language.value),
    );
    //qrContainer, cantReadButton, preferNotToReadButton, noSmartphoneButton, explanation
    ConnectionManagerDisplay.qrContainer = container.qrContainer;
    ConnectionManagerDisplay.cantReadButton = container.cantReadButton;
    ConnectionManagerDisplay.preferNotToReadButton =
      container.preferNotToReadButton;
    ConnectionManagerDisplay.noSmartphoneButton = container.noSmartphoneButton;
    ConnectionManagerDisplay.explanation = container.explanation;

    //add event listeners
    ConnectionManagerDisplay.cantReadButton.addEventListener(
      "click",
      async () => {
        QRSkipResponse.QRCantBool = true;
        psychoJS.experiment.addData("QRConnect", "✖Cannot");
        psychoJS.experiment.nextEntry();
        quitPsychoJS("", false, paramReader, !isProlificExperiment(), false);
        showExperimentEnding(true, isProlificExperiment(), rc.language.value);
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

await getConnectionManagerDisplay(false);

//register submodules

//compatibility peer
export const CompatibilityPeer = new EasyEyesPeer.ExperimentPeer({
  text: readi18nPhrases("RC_smartphoneOkThanks", rc.language.value),
  timeout: timeoutNewPhoneSec.current,
});

console.log("CompatibilityPeer", CompatibilityPeer);

ConnectionManager.registerSubmodule(CompatibilityPeer);

//sound calibration
export const SoundCalibrationPeer = speakerCalibrator.Speaker;

ConnectionManager.registerSubmodule(SoundCalibrationPeer);

//keypad
