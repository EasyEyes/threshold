import { KeyPress } from "../psychojs/src/core/index.js";
import { status, rc, _key_resp_allKeys, thisExperimentInfo } from "./global";
import { psychoJS } from "./globalPsychoJS.js";
import { readi18nPhrases } from "./readPhrases.js";
import { logger } from "./utils";
import { Receiver } from "virtual-keypad";

const ALPHABET_CONSTANTS = ["RETURN", "SPACE"];

// TODO clarify between: responseTypedEasyEyesKeypadBool, simulateKeypadBool, wirelessKeyboardNeededBool

export class KeypadHandler {
  constructor(reader) {
    this.reader = reader;
    this.conditionsRequiringKeypad = this.readKeypadParams();
    const keypadDistanceThreshold = String(
      Math.round(Number(this.reader.read("needEasyEyesKeypadBeyondCm")[0]))
    );
    this.disabledMessage = readi18nPhrases(
      "T_keypadInactive",
      rc.language.value
    ).replace("111", keypadDistanceThreshold);

    this.alphabet = [];
    this.font = "sans-serif";
    this.message = "";
    this.BC = undefined;

    this.receiver = undefined;
    this.acceptingResponses = false;
    // Is the experiment doing something which cannot be interrupted by a response
    this.sensitive = false;
    this.connection = undefined;

    this.onDataCallback = (message) => {
      if (this.acceptingResponses) {
        let response = message.response.toLowerCase();

        const responseKeypress = new KeyPress(undefined, undefined, response);
        _key_resp_allKeys.current.push(responseKeypress);
      }
    };
    if (this.keypadRequiredInExperiment()) this.initKeypad();
  }
  readKeypadParams() {
    const conditionsNeedingKeypad = new Map();
    for (let condition of this.reader.conditions) {
      const BC = condition.block_condition;
      const keypadRequested = this.reader.read(
        "responseTypedEasyEyesKeypadBool",
        BC
      );
      conditionsNeedingKeypad.set(BC, keypadRequested);
    }
    return conditionsNeedingKeypad;
  }
  keypadRequired(BC) {
    return this.conditionsRequiringKeypad.get(BC);
  }
  keypadRequiredInExperiment() {
    return [...this.conditionsRequiringKeypad.values()].some((x) => x);
  }
  async update(alphabet, font, BC) {
    this.updateKeypadMessage("");
    this.alphabet = this._getFullAlphabet(alphabet ?? this.alphabet);
    this.font = font ?? this.font;
    this.BC = BC ?? this.BC;
    if (!this.receiver) {
      await this.initKeypad();
    } else {
      this.receiver.update(this.alphabet, this.font);
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
    // TODO this breaks if keypad use is not unique within block
    if (
      this.keypadRequired(this.BC) ||
      this.reader
        .read("responseTypedEasyEyesKeypadBool", status.block)
        .some((x) => x)
    ) {
      this.updateKeypadMessage("");
    } else {
      this.updateKeypadMessage(this.disabledMessage);
    }
  }
  stop() {
    // TODO visually disable keys
    this.acceptingResponses = false;
    this.receiver?.update([]);
    this.updateKeypadMessage(this.disabledMessage);
  }
  forgetKeypad() {
    this.receiver = undefined;
    this.connection = undefined;
  }
  updateKeypadMessage(message) {
    console.log("!. to update message", message);
    if (this.connection) {
      logger(
        `updating message, from ${this.message} to ${message}`,
        this.message !== message
      );
      this.receiver?.updateDisplayMessage(message);
      this.message = message;
    }
  }
  async initKeypad() {
    const handshakeCallback = () => {
      setTimeout(() => {
        if (
          this.reader
            .read("responseTypedEasyEyesKeypadBool", status.block)
            .some((x) => x)
        ) {
          this.start();
        } else {
          this.stop();
        }
      }, 1000);
      this.hideQRPopup();
    };
    const keypadReceiver = new Receiver(
      { alphabet: this.alphabet ?? "", font: this.font ?? "Sans" },
      this.onDataCallback,
      handshakeCallback,
      this.onConnectionCallback,
      this.onCloseCallback,
      this.onErrorCallback
    );
    this.receiver = keypadReceiver;

    const qrImage = await this.createQRCode();
    this.showQRPopup(qrImage);
  }
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
          100
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
        "T_keypadScanQRCode",
        rc.language.value
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
  endRoutine(BC) {
    const shouldEndRoutine =
      this.keypadRequired(BC) &&
      _key_resp_allKeys.current.map((kp) => kp.name).includes("space");
    return shouldEndRoutine;
  }
  clearKeys(BC) {
    if (typeof BC !== "undefined") {
      if (this.keypadRequired(BC)) _key_resp_allKeys.current = [];
      return;
    }
    _key_resp_allKeys.current = [];
  }
  // removeSpaceKey() {
  //   this.alphabet = this.alphabet.filter((x) => x !== "space");
  //   this.update();
  // }
  setSensitive() {
    this.sensitive = true;
  }
  setNonSensitive() {
    this.sensitive = false;
  }
  _getFullAlphabet(keys) {
    const full = [];
    keys.forEach((k) => {
      switch (k.toLowerCase()) {
        case "return":
          full.push("RETURN");
          break;
        case "space":
          full.push("SPACE");
          break;
        default:
          full.push(k);
      }
    });
    if (!full.includes("RETURN")) full.push("RETURN");
    if (!full.includes("SPACE")) full.push("SPACE");
    return full;
  }
}
