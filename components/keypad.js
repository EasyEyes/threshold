import Swal from "sweetalert2";
import { KeyPress } from "../psychojs/src/core/index.js";
import { warning } from "./errorHandling.js";
import {
  status,
  targetKind,
  rc,
  _key_resp_allKeys,
  thisExperimentInfo,
  rsvpReadingResponse,
  proxyVariable_key_resp_allKeys,
} from "./global";
import { readi18nPhrases } from "./readPhrases.js";
import { getButtonsContainer } from "./useSoundCalibration.js";
import { arraysEqual, logger } from "./utils";
// import { Receiver } from "virtual-keypad";
import { ConnectionManager } from "./connectAPeer.js";

export class KeypadHandler {
  constructor(reader) {
    this.reader = reader;
    this.name = "keypad";
    [
      this.conditionsRequiringKeypad,
      this.blocksRequiringKeypad,
      this.keypadDistanceThresholds,
      this.keypadNeededDuringTrackDistanceCheck,
    ] = this._readKeypadParams();
    const keypadDistanceThreshold = String(
      Math.round(Number(this.reader.read("needEasyEyesKeypadBeyondCm")[0])),
    );
    this.disabledMessage = readi18nPhrases(
      "T_keypadDisabled",
      rc.language.value,
    ).replace("111", keypadDistanceThreshold);
    this.controlButtons = this._getControlButtonStrings();
    this.alphabet = this._getFullAlphabet([]);
    this.font = "sans-serif";
    this.message = "";
    this.BC = undefined;
    this.receiver = undefined;
    this.acceptingResponses = false;
    // Is the experiment doing something which cannot be interrupted by a response
    this.sensitive = false;
    this.connection = undefined;
    this.hideMessage = false;
    this.onDataCallback = (message) => {
      const skipBlockStr = readi18nPhrases("T_SKIP_BLOCK", rc.language.value);
      const response = message?.response?.toLowerCase();
      if (this.acceptingResponses) {
        // TODO general handling of all control buttons?
        if (message.response === skipBlockStr || response === skipBlockStr) {
          document.dispatchEvent(new Event("skip-block"));
        } else if (
          targetKind.current === "rsvpReading" &&
          rsvpReadingResponse.responseType !== "spoken" &&
          !(
            this.controlButtons.includes(message.response) ||
            this.controlButtons.map((s) => s.toLowerCase()).includes(response)
          )
        ) {
          // Phrase Identification
          // TODO more robust, handle duplicates
          const items = document.querySelectorAll(
            ".phrase-identification-category-item",
          );
          const selected =
            [...items].find((i) => i.id.match(response)) ??
            [...items].find((i) => i.id.match(message.response));
          if (typeof selected !== "undefined") {
            selected.click();
          } else {
            warning(
              `Rsvp keypad response did not match a phraseIdentification item. response: ${message.response}, normalized response: ${response}`,
            );
          }
        } else {
          const responseKeypress = new KeyPress(undefined, undefined, response);
          _key_resp_allKeys.current.push(responseKeypress);
          proxyVariable_key_resp_allKeys.push(responseKeypress);
        }
      }
    };
    this.useQRPopup = false;
    if (this.inUse()) this.initKeypad();
  }
  _getControlButtonStrings() {
    const controlButtonStrings = [];
    const spaceStr = readi18nPhrases("T_SPACE", rc.language.value);
    const returnStr = readi18nPhrases("T_RETURN", rc.language.value);
    controlButtonStrings.push(spaceStr, returnStr);
    const skipBlockStr = readi18nPhrases("T_SKIP_BLOCK", rc.language.value);
    const showSkipBlock =
      typeof status.block !== "undefined" && this.reader
        ? this.reader
            .read("responseSkipBlockForWhom", status.block)
            .some((s) => s === "scientist") &&
          typeof thisExperimentInfo.ProlificSessionID === "undefined"
        : false;
    if (showSkipBlock) controlButtonStrings.push(skipBlockStr);
    return controlButtonStrings;
  }
  _readKeypadParams() {
    const conditionsNeedingKeypad = new Map();
    const blocksNeedingKeypad = new Map();
    const keypadDistanceThresholds = new Map();
    let calibrateTrackDistanceCheckCm = [];
    let keypadNeededDuringTrackDistanceCheck = false;
    for (let condition of this.reader.conditions) {
      const BC = condition.block_condition;
      const block = Number(BC.split("_")[0]);
      const keypadRequested = this.reader.read(
        "!responseTypedEasyEyesKeypadBool",
        BC,
      );
      const keypadDistanceThreshold = this.reader.read(
        "needEasyEyesKeypadBeyondCm",
        BC,
      );

      if (this.reader.read("calibrateTrackDistanceCheckBool", BC)) {
        calibrateTrackDistanceCheckCm = this.reader
          .read("calibrateTrackDistanceCheckCm", BC)
          .split(", ");
        //check if any value in calibrateTrackDistanceCheckCm is greater than keypadDistanceThresholds
        if (
          calibrateTrackDistanceCheckCm.some(
            (r) => parseFloat(r) > parseFloat(keypadDistanceThreshold),
          )
        ) {
          keypadNeededDuringTrackDistanceCheck = true;
        }
      }
      conditionsNeedingKeypad.set(BC, keypadRequested);
      keypadDistanceThresholds.set(BC, keypadDistanceThreshold);
      if (keypadRequested) {
        blocksNeedingKeypad.set(block, true);
      } else if (!blocksNeedingKeypad.has(block)) {
        blocksNeedingKeypad.set(block, false);
      }
    }

    return [
      conditionsNeedingKeypad,
      blocksNeedingKeypad,
      keypadDistanceThresholds,
      keypadNeededDuringTrackDistanceCheck,
    ];
  }
  inUse(blockOrCondition) {
    const forExperiment = typeof blockOrCondition === "undefined";
    const isCondition = isNaN(Number(blockOrCondition));
    if (forExperiment) return this._keypadRequiredInExperiment();
    if (isCondition) return this._keypadRequiredInCondition(blockOrCondition);
    return this._keypadRequiredInBlock(blockOrCondition);
  }
  _keypadRequiredInCondition(BC) {
    return this.conditionsRequiringKeypad.get(BC);
  }
  _keypadRequiredInBlock(block) {
    const keypadRequiredInBlock = this.blocksRequiringKeypad.get(block);
    return keypadRequiredInBlock;
  }
  _keypadRequiredInExperiment() {
    const someConditionUsesKeypad = [
      ...this.conditionsRequiringKeypad.values(),
    ].some((x) => x);
    return someConditionUsesKeypad || this.keypadNeededDuringTrackDistanceCheck;
  }
  async update(alphabet, font, BC, force = false) {
    if (!this.inUse()) return;
    this.updateKeypadMessage("", force);

    const controlButtonsChanged = !arraysEqual(
      [...this.controlButtons].sort(),
      [...this._getControlButtonStrings()].sort(),
    );
    this.controlButtons = this._getControlButtonStrings();
    alphabet = this._getFullAlphabet(alphabet);
    const alphabetChanged = !arraysEqual(
      [...alphabet].sort(),
      [...this.alphabet].sort(),
    );
    if (alphabetChanged)
      logger("!. alphabetChanged, [alphabet, this.alphabet]", [
        alphabet,
        this.alphabet,
      ]);
    const fontChanged = font !== this.font;
    if (fontChanged)
      logger("!. fontChanged, [font, this.font]", [font, this.font]);
    const BCChanged = BC !== this.BC;

    this.alphabet = this._getFullAlphabet(alphabet ?? this.alphabet);
    this.font = font ?? this.font;
    this.BC = BC ?? this.BC;
    if (!this.receiver) {
      await this.initKeypad();
    } else {
      this.clearKeys(this.BC);
      if (alphabetChanged || fontChanged || controlButtonsChanged || force) {
        this.receiver.update(this.alphabet, this.font, this.controlButtons);
      }
      // Update the stored disabled message, so it references the correct viewing distance threshold for this condition
      if (BCChanged)
        this.disabledMessage = readi18nPhrases(
          "T_keypadDisabled",
          rc.language.value,
        ).replace("111", this.keypadDistanceThresholds.get(BC));
    }
  }
  /**
   * Set the keypad as active.
   * Keys show and wait message is removed.
   * Should run cheaply and without error if called when keypad not in use.
   */
  start() {
    // TODO visually enable keys
    this.acceptingResponses = true;
    this.receiver?.update(this.alphabet, this.font);
  }
  stop() {
    // TODO visually disable keys
    this.acceptingResponses = false;
    this.receiver?.update([], this.font);
    this.updateKeypadMessage(this.disabledMessage);
  }
  forgetKeypad() {
    // this.receiver = undefined;
    this.connection = undefined;
  }
  updateKeypadMessage(message, force = false) {
    if (this.connection) {
      logger(
        `!. updating message, from ${this.message} to ${message}`,
        this.message !== message,
      );
      if (this.message !== message || force) {
        this.receiver?.updateDisplayMessage(message);
        this.message = message;
      }
    }
  }
  async initKeypad() {
    if (this.receiver) {
      this.receiver.initializeKeypad();
      return;
    }
    const handshakeCallback = () => {
      if (this.inUse()) {
        this.start();
      } else {
        this.stop();
      }
      this.hideMessage ? this.hideQRPopup() : this.hideQR();
      this.hideMessage = true;
    };
    this.receiver ??= new virtualKeypad.ExperimentPeer(
      {
        alphabet: this.alphabet ?? [],
        font: this.font ?? "sans-serif",
        onErrorReconnectMessage: readi18nPhrases(
          "RC_reconnect",
          rc.language.value,
        ),
        controlButtons: this.controlButtons ?? [],
      },
      this.onDataCallback,
      handshakeCallback,
      this.onConnectionCallback,
      this.onCloseCallback,
      this.onErrorCallback,
      ConnectionManager.handler,
    );

    this.onMessage = this.receiver.onMessage;

    // this.receiver.initializeKeypad();

    // const qrImage = await this.createQRCode();
    // // this.showQRPopup(qrImage);
    // this.useQRPopup ? this.showQRPopup(qrImage) : await this.showQR(qrImage);
  }

  resolveWhenConnected = async () => {
    if (!this.inUse()) return;
    return new Promise((resolve) => {
      if (this.connection && this.hideMessage) {
        resolve();
      } else {
        const interval = setInterval(() => {
          if (this.connection && this.hideMessage) {
            clearInterval(interval);
            this.useQRPopup = true;
            resolve();
          }
        }, 10);
      }
    });
  };
  onConnectionCallback = (connection) => {
    this.connection = connection;
    logger("KEYPAD connected", connection);
  };
  onCloseCallback = () => {
    logger("KEYPAD closed");
    this.forgetKeypad();
    this.initKeypad();
    logger("KEYPAD inited after closed");
  };
  onErrorCallback = (err) => {
    logger("KEYPAD error", err);
  };
  async createQRCode() {
    const qrImage = new Image();
    qrImage.setAttribute("id", "qrImage");
    qrImage.style.zIndex = Infinity;
    qrImage.style.minWidth = 400;
    qrImage.style.minHeight = 400;
    qrImage.style.aspectRatio = 1;
    // qrImage.style.height = "100%";
    // qrImage.style.width = "100%";
    while (!this.receiver.qrURI) {
      await this.waitALittle(10);
    }
    qrImage.src = this.receiver.qrURI;
    return qrImage;
  }
  waitALittle(time = 250) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }
  showQRPopup(qrImage) {
    if (this.sensitive) {
      if (!this.reattemptPopupInterval)
        this.reattemptPopupInterval = setInterval(
          () => this.showQRPopup(qrImage),
          100,
        );
    } else if (this.sensitive === false) {
      const expName = thisExperimentInfo.name;
      const container = document.getElementById(`${expName}-container`);
      const title = document.getElementById(`${expName}-title`);
      // const subtitle = document.getElementById(`${expName}-sub-text`);
      const popup = document.getElementById(`${expName}-popup`);

      popup.style.width = "60%";
      popup.style.height = "max-content";

      qrImage.style.display = "block";
      container.style.display = "block";
      // subtitle.style.display = "block";
      qrImage.style.margin = "auto";

      title.innerHTML = readi18nPhrases(
        "RC_reconnectYourPhone",
        rc.language.value,
      );
      // subtitle.innerHTML = readi18nPhrases(
      //   "T_keypadScanQRCodeSubtitle",
      //   rc.language.value
      // );
      title.appendChild(qrImage);
      if (this.reattemptPopupInterval)
        clearInterval(this.reattemptPopupInterval);
    }
  }
  hideQRPopup() {
    const expName = thisExperimentInfo.name;
    const container = document.getElementById(`${expName}-container`);
    const popup = document.getElementById(`${expName}-popup`);
    popup.style.width = "40%";
    popup.style.height = "30%";

    container.style.display = "none";
  }
  async showQR(qrImage) {
    if (this.sensitive) {
      if (!this.reattemptPopupInterval)
        this.reattemptPopupInterval = setInterval(
          async () => await this.showQR(qrImage),
          100,
        );
    } else if (this.sensitive === false) {
      const title = document.getElementById(`virtual-keypad-title`);
      if (title) {
        title.style.display = "block";
        title.innerText = readi18nPhrases(
          "T_keypadScanQRCode",
          rc.language.value,
        );

        // Main container with 3 columns
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "flex-start";
        container.style.paddingTop = "15px";

        // Column 1: QR Code
        const qrColumn = document.createElement("div");
        qrColumn.style.flex = "0 0 auto";
        qrImage.style.display = "block";
        qrImage.style.margin = "-13px";
        qrImage.style.width = "150px";
        qrImage.style.height = "150px";
        qrColumn.appendChild(qrImage);

        // Column 2: Explanation Text
        const textColumn = document.createElement("div");
        textColumn.style.flex = "1";
        textColumn.style.padding = "0 20px";
        textColumn.style.maxWidth = "560px";

        const explanation = document.createElement("h2");
        explanation.id = "skipQRExplanation";
        explanation.style.margin = "0";
        explanation.style.textAlign = "left";
        explanation.style.fontSize = "1.1rem";
        explanation.style.userSelect = "text";

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
            originalURL: this.receiver.qrURL,
          }),
        };

        try {
          const response = await fetch(url, options);
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const data = await response.json();

          explanation.innerHTML = formatLineBreak(
            readi18nPhrases(
              "RC_skipQR_ExplanationWithoutPreferNot",
              rc.language.value,
            )
              .replace(
                "xxx",
                `<b style="user-select: text">${data.shortURL}</b>`,
              )
              .replace(
                "XXX",
                `<b style="user-select: text">${data.shortURL}</b>`,
              ),
            readi18nPhrases("RC_checkInternetConnection", rc.language.value),
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
          explanation
            .querySelector("a#check-connection")
            .replaceWith(checkConnection);
        } catch (error) {
          console.error("Error:", error.message);
        }

        textColumn.appendChild(explanation);

        // Column 3: Buttons
        const buttonColumn = document.createElement("div");
        buttonColumn.style.display = "flex";
        buttonColumn.style.flexDirection = "column";
        buttonColumn.style.gap = "10px";
        buttonColumn.style.flex = "0 0 auto";
        buttonColumn.style.alignItems = "flex-end";
        buttonColumn.appendChild(getButtonsContainer(rc.language.value));

        // Assemble the columns
        container.appendChild(qrColumn);
        container.appendChild(textColumn);
        container.appendChild(buttonColumn);
        title.appendChild(container);
      }

      if (this.reattemptPopupInterval) {
        clearInterval(this.reattemptPopupInterval);
      }
    }
  }

  hideQR() {
    const title = document.getElementById(`virtual-keypad-title`);
    // title.style.display = "none";
    if (title) {
      title.innerHTML = readi18nPhrases(
        "RC_PhoneConnected2",
        rc.language.value,
      );
    }
  }
  endRoutine(BC) {
    const shouldEndRoutine =
      this.inUse(BC) &&
      _key_resp_allKeys.current
        .map((kp) => kp.name.toLowerCase())
        .includes(readi18nPhrases("T_SPACE", rc.language.value).toLowerCase());
    return shouldEndRoutine;
  }
  clearKeys(BC) {
    if (typeof BC !== "undefined") {
      if (this.inUse(BC)) _key_resp_allKeys.current = [];
      return;
    }
    _key_resp_allKeys.current = [];
  }
  setSensitive() {
    this.sensitive = true;
  }
  setNonSensitive() {
    this.sensitive = false;
  }
  _getFullAlphabet(keys) {
    const full = [];
    const allLowercaseControlButtons = this.controlButtons.map((s) =>
      s.toLowerCase(),
    );
    keys.forEach((k) => {
      // Ensure control buttons are all capitalized
      if (allLowercaseControlButtons.includes(k.toLowerCase())) {
        full.push(k.toUpperCase());
        // And only valid keys are included
      } else if (typeof k !== "undefined") {
        full.push(k);
      }
    });
    // Ensure all the control buttons are included
    allLowercaseControlButtons.forEach((k) => {
      if (!full.map((s) => s.toLowerCase()).includes(k))
        full.push(k.toUpperCase());
    });
    return full;
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

const createAndShowPopup = (lang) => {
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

const formatLineBreak = (inputStr, checkInternetConnection) => {
  let finalStr = inputStr
    .replace(/\n/g, "<br>")
    .replace(
      "LLL",
      `<a href="#" id="check-connection">${checkInternetConnection}</a>`,
    );
  return finalStr;
};

export const keypadRequiredInExperiment = (paramReader) => {
  const conditionsRequiringKeypad = new Map();
  let keypadNeededDuringTrackDistanceCheck = false;

  for (let condition of paramReader.conditions) {
    const BC = condition.block_condition;
    const keypadRequested = paramReader.read(
      "!responseTypedEasyEyesKeypadBool",
      BC,
    );
    const keypadDistanceThreshold = paramReader.read(
      "needEasyEyesKeypadBeyondCm",
      BC,
    );

    conditionsRequiringKeypad.set(BC, keypadRequested);

    if (paramReader.read("calibrateTrackDistanceCheckBool", BC)) {
      const calibrateTrackDistanceCheckCm = paramReader
        .read("calibrateTrackDistanceCheckCm", BC)
        .split(", ");

      if (
        calibrateTrackDistanceCheckCm.some(
          (r) => parseFloat(r) > parseFloat(keypadDistanceThreshold),
        )
      ) {
        keypadNeededDuringTrackDistanceCheck = true;
      }
    }
  }

  const someConditionUsesKeypad = [...conditionsRequiringKeypad.values()].some(
    (x) => x,
  );
  return someConditionUsesKeypad || keypadNeededDuringTrackDistanceCheck;
};
