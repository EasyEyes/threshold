import { core, util, visual } from "../psychojs/out/psychojs-2021.3.0";
const { PsychoJS, EventManager } = core;
const { Scheduler } = util;

const ALPHABET_CONSTANTS = ["ESC", "SPACE"];

// TODO clarify between: responseTypedEasyEyesKeypadBool, simulateKeypadBool, wirelessKeyboardNeededBool

export var keypadResponseThisTrial = false;

export const readKeypadParams = (reader) => {
  window.keypadResponseThisTrial = false;
  const keypadRequirements = {};
  for (let condition of reader.conditions) {
    const label = condition.label;
    const block = condition.block;
    if (
      !keypadRequirements.hasOwnProperty(block) &&
      (condition.responseTypedEasyEyesKeypadBool ||
        condition.wirelessKeyboardNeededBool)
    ) {
      keypadRequirements[block] = {};
    }
    keypadRequirements[block][label] = {
      responseTypedEasyEyesKeypadBool:
        condition.responseTypedEasyEyesKeypadBool,
      wirelessKeyboardNeededBool: condition.wirelessKeyboardNeededBool,
      alphabet: condition.targetAlphabet.split(""),
      font: condition.targetFont,
    };
  }
  return keypadRequirements;
};

const onDataCallback = (message) => {
  const keypadKeypressEvent = {
    key: message.response,
    code: EventManager.keycode2w3c(message.response),
    keyCode: 0,
    which: 0,
  };
  const keypadKeydown = new KeyboardEvent("keydown", keypadKeypressEvent);
  const keypadKeyup = new KeyboardEvent("keyup", keypadKeypressEvent);
  window.dispatchEvent(keypadKeydown);
  window.dispatchEvent(keypadKeyup);
  // TEMP
  window.keypadResponseThisTrial = true;
  return Scheduler.Event.NEXT;
};

// const onDataCallback = (message, trial, psychoJS) => {
//   // Map response to a corresponding ascii key
//   const responseToSignalKeyCode = createSignalingMap(trial.possibleResponses);

//   const participantResponse = message.response;
//   const correctResponse = trial.correctResponse;

//   const participantSignalingKeyCode = responseToSignalKeyCode[participantResponse];
//   const correctSignalingKeyCode = responseToSignalKeyCode[correctResponse];

//   const participantSignalingKey = String.fromCharCode(participantSignalingKeyCode);
//   const correctSignalingKey = String.fromCharCode(correctSignalingKeyCode);

//   const participantSignalingCode = EventManager.keycode2w3c(participantSignalingKey);
//   const correctSignalingCode = EventManager.keycode2w3c(correctSignalingKeyCode);

//   addResponseAndSignalingToExperiment(participantResponse, correctResponse, participantSignalingKey, correctSignalingKey, responseToSignalKeyCode, psychoJS);

//   const keypadKeypressEvent = {
//     key: participantSignalingKey,
//     code: participantSignalingCode,
//     keyCode: participantSignalingKeyCode,
//     which: participantSignalingKeyCode,
//   };
//   const keypadKeydown = new KeyboardEvent("keydown", keypadKeypressEvent);
//   const keypadKeyup = new KeyboardEvent("keyup", keypadKeypressEvent);
//   window.dispatchEvent(keypadKeydown);
//   window.dispatchEvent(keypadKeyup);

//   const theseKeys = keyboard.getKeys({ waitRelease: false, });
//   keyboard.keys = theseKeys[0].name;
//   keyboard.rt = theseKeys[0].rt;

//   const signalingCorrect = signalingKeyCode === correctSignalingKeyCode;
//   const actualCorrect = participantResponse === correctResponse;
//   if ((actualCorrect) !== (signalingCorrect)) console.warn("ASSUMPTION BROKEN: Signaling characters inconsistent with actual response");
//   if (signalingCorrect) {
//     keyboard.corr = 1;
//   } else {
//     keyboard.corr = 0;
//   }

//   return Scheduler.Event.NEXT;
// };

const addResponseAndSignalingToExperiment = (
  response,
  correctResponse,
  signalingKey,
  correctSignalingKey,
  responseToSignalKeyCode,
  psychoJS
) => {
  // Add variables to the output datafile
  psychoJS.experiment.addData("response", response);
  psychoJS.experiment.addData("correctResponse", correctResponse);
  psychoJS.experiment.addData("signalingKey", signalingKey);
  psychoJS.experiment.addData("correctSignalingKey", correctSignalingKey);
  psychoJS.experiment.addData(
    "signalingAlphabet",
    Object.values(responseToSignalKeyCode).map((keycode) =>
      String.fromCharCode(keycode)
    )
  );
};

export const initKeypad = async (psychoJS) => {
  // Initialize components for Routine "keypadInit"
  const keypadInitClock = new util.Clock();
  const qrCodeStim = new visual.ImageStim({
    win: psychoJS.window,
    name: "qrCodeImage",
    units: undefined,
    image: undefined,
    mask: undefined,
    ori: 0.0,
    pos: [0, 0],
    size: [0.5, 0.5],
    color: new util.Color([0, 0, 0]),
    opacity: undefined,
    flipHoriz: false,
    flipVert: false,
    texRes: 128.0,
    interpolate: true,
    depth: 0.0,
  });

  const alphabet = [];
  const handshakeCallback = () => {
    console.log("confirm access to receiver: ", keypadReceiver);
    keypadReceiver.updateDisplayMessage(
      "Keypad connected! Please keep this page open, until the experiment prompts you to use it."
    );
    qrCodeStim.status = PsychoJS.Status.FINISHED;
    Scheduler.Event.NEXT;
  };
  const keypadReceiver = new virtualKeypad.Receiver(
    { alphabet: alphabet, font: "Sans" },
    onDataCallback,
    handshakeCallback
  );
  window.receiver = keypadReceiver;
  const qrImage = await getQRCodeImage(keypadReceiver);
  qrCodeStim.setImage(qrImage);
  return [keypadReceiver, qrCodeStim, keypadInitClock];
};

function waitALittle(time = 250) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
export async function getQRCodeImage(receiver) {
  const qrImage = new Image();
  qrImage.setAttribute("id", "qrImage");
  qrImage.style.zIndex = 9000;
  while (!receiver.qrURI) {
    await waitALittle(10);
  }
  qrImage.src = receiver.qrURI;
  return qrImage;
}
