import { KeyPress } from "../psychojs/src/core/index.js";
import { rc, _key_resp_allKeys, thisExperimentInfo } from "./global";
import { phrases } from "./i18n.js";
import { logger } from "./utils";
import { Receiver } from "virtual-keypad";

// const ALPHABET_CONSTANTS = ["ESC", "SPACE"];

// TODO clarify between: responseTypedEasyEyesKeypadBool, simulateKeypadBool, wirelessKeyboardNeededBool

export class KeypadHandler {
  constructor(reader) {
    this.reader = reader;
    this.conditionsRequiringKeypad = this.readKeypadParams();

    this.alphabet = [];
    this.font = "";
    this.message = "";

    this.receiver = undefined;
    this.acceptingResponses = false;
    // Is the experiment doing something which cannot be interrupted by a
    this.sensitive = false;
    this.connection = undefined;

    this.onDataCallback = (message) => {
      if (this.acceptingResponses) {
        const response = message.response.toLowerCase();
        const responseKeypress = new KeyPress(undefined, undefined, response);
        _key_resp_allKeys.current.push(responseKeypress);
      }
    };
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
  async update(alphabet, font) {
    this.alphabet = alphabet ?? this.alphabet;
    this.font = font ?? this.font;
    if (!this.receiver) {
      await this.initKeypad();
    } else {
      this.receiver.update(this.alphabet, this.font);
    }
  }
  start() {
    this.acceptingResponses = true;
  }
  stop() {
    this.acceptingResponses = false;
  }
  forgetKeypad() {
    this.receiver = undefined;
    this.connection = undefined;
  }
  updateKeypadMessage(message) {
    if (this.message !== message && this.connection) {
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
      this.updateKeypadMessage(
        phrases.T_keypadConnectedAndKeepReady[rc.language.value]
      );
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
      const subtitle = document.getElementById(`${expName}-sub-text`);

      container.style.display = "block";
      container.style.zIndex = Infinity;
      subtitle.style.display = "block";
      title.innerHTML = phrases.T_keypadScanQRCode[rc.language.value];
      subtitle.innerHTML =
        phrases.T_keypadScanQRCodeSubtitle[rc.language.value];
      title.appendChild(qrImage);
      if (this.reattemptPopupInterval)
        clearInterval(this.reattemptPopupInterval);
    }
  }
  hideQRPopup() {
    const expName = thisExperimentInfo.name;
    const container = document.getElementById(`${expName}-container`);

    container.style.display = "none";
  }
  endRoutine(BC) {
    const shouldEndRoutine =
      this.keypadRequired(BC) &&
      _key_resp_allKeys.current.map((kp) => kp.name).includes("space");
    return shouldEndRoutine;
  }
  clearKeys(BC) {
    if (BC) _key_resp_allKeys.current = [];
  }
  removeSpaceKey() {
    this.alphabet = this.alphabet.filter((x) => x !== "space");
    this.update();
  }
  setSensitive() {
    this.sensitive = true;
  }
  setNonSensitive() {
    this.sensitive = false;
  }
}
