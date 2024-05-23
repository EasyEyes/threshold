import { KeyPress } from "../psychojs/src/core/index.js";
import { status, rc, _key_resp_allKeys, thisExperimentInfo } from "./global";
import { readi18nPhrases } from "./readPhrases.js";
import { arraysEqual, logger } from "./utils";
import { Receiver } from "virtual-keypad";

export class KeypadHandler {
  constructor(reader) {
    this.reader = reader;
    [
      this.conditionsRequiringKeypad,
      this.blocksRequiringKeypad,
      this.keypadDistanceThresholds,
    ] = this._readKeypadParams();
    const keypadDistanceThreshold = String(
      Math.round(Number(this.reader.read("needEasyEyesKeypadBeyondCm")[0])),
    );
    this.disabledMessage = readi18nPhrases(
      "T_keypadDisabled",
      rc.language.value,
    ).replace("111", keypadDistanceThreshold);

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
      if (this.acceptingResponses) {
        let response = message.response.toLowerCase();

        const responseKeypress = new KeyPress(undefined, undefined, response);
        _key_resp_allKeys.current.push(responseKeypress);
      }
    };
    this.useQRPopup = false;
    if (this.inUse()) this.initKeypad();
  }
  _readKeypadParams() {
    const conditionsNeedingKeypad = new Map();
    const blocksNeedingKeypad = new Map();
    const keypadDistanceThresholds = new Map();
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
    return someConditionUsesKeypad;
  }
  async update(alphabet, font, BC, force = false) {
    this.updateKeypadMessage("", force);

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
      if (alphabetChanged || fontChanged || force) {
        this.receiver.update(this.alphabet, this.font);
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
    const handshakeCallback = () => {
      if (this.inUse(status.block)) {
        this.start();
      } else {
        this.stop();
      }
      // this.hideQRPopup();
      this.hideQR();
      this.hideMessage = true;
    };
    this.receiver ??= new Receiver(
      { alphabet: this.alphabet ?? [], font: this.font ?? "sans-serif" },
      this.onDataCallback,
      handshakeCallback,
      this.onConnectionCallback,
      this.onCloseCallback,
      this.onErrorCallback,
    );

    const qrImage = await this.createQRCode();
    console.log("qrImage", qrImage);
    // this.showQRPopup(qrImage);
    this.useQRPopup ? this.showQRPopup(qrImage) : this.showQR(qrImage);
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
  showQR(qrImage) {
    if (this.sensitive) {
      if (!this.reattemptPopupInterval)
        this.reattemptPopupInterval = setInterval(
          () => this.showQR(qrImage),
          100,
        );
    } else if (this.sensitive === false) {
      const title = document.getElementById(`virtual-keypad-title`);
      title.style.display = "block";
      if (qrImage) {
        qrImage.style.display = "block";
        qrImage.style.marginLeft = "-13px";
      }

      title.innerText = readi18nPhrases(
        "T_keypadScanQRCode",
        rc.language.value,
      );
      title.appendChild(qrImage);
      if (this.reattemptPopupInterval)
        clearInterval(this.reattemptPopupInterval);
    }
  }
  hideQR() {
    const title = document.getElementById(`virtual-keypad-title`);
    title.style.display = "none";
  }
  endRoutine(BC) {
    const shouldEndRoutine =
      this.inUse(BC) &&
      _key_resp_allKeys.current
        .map((kp) => kp.name.toLowerCase())
        .includes("space");
    return shouldEndRoutine;
  }
  clearKeys(BC) {
    if (typeof BC !== "undefined") {
      if (this.inUse(BC)) _key_resp_allKeys.current = [];
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
