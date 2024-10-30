import Swal from "sweetalert2";
import { ParamReader } from "../parameters/paramReader";

let ctx: AudioContext;

type BlockId = number;

type AudioOutputId = string;
type AudioOutputLabel = string;
type MediaOptions = { [key: AudioOutputId]: AudioOutputLabel };

const testSound64 =
  "data:audio/mpeg;base64,//vgxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAAMPQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAA5TEFNRTMuMTAwAc0AAAAAAAAAABT/JAaUQQABQAAADD172g66AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vgxAAD9Y4RGA5rDwbhwaNBzWHxPp7c8LRTf67M7i0wUVjSTGN5Rw6BYjwViPp7E9nrTzuJO51k57HTfbVNXocy2KwuCDbxznzzjuzVl0BxjkRtIByJhzoR1Ypu15nxagRhihnERokBmiAcEQYMYWM8mNUqNQkM8UAxReJhRJ64fNHaAGY10ElNsTrU6tORggDcQKU1vOMTakHHfoGhM6ze83tNI0N2xAwBmIcWmtIKO56VAAEZjGQRbxe7cC1BiMZjGQRbxsyt4AEZCGQRaBajxl/wCEBHMgC7DeMDLhgEICGgu97Ay4YBCYwgYaKbztIQkAIZZtAG27oImFlCyBdhH+FtIRMLYFyEwHscMu4WULIFtEwIQ4aX6D5cRMB5HTRPLZlp0AbB4qytIdAOg+pvA7oJiFpy05eNTeTuAoAiomAruRugl4XcLkIOLopWGJCIqJELokDpqBoPltEHF0TrhqBorqDuPLXDS/QDoB0i11y5rCQ6K6RbE55wFAEVEiEU2XzzgKAJiKCNMpWUJCISEHEwGWUrhqnRUTEZZOuGoGiukWsdxKrW1A0x1B2X0zWEh0A6D6g7j1msMQikxLOGZ4Idt1R8vtH4fEfh7B8/fHqcUdpoBxV9GmkaZcEoVHBmlHGr2MbXcRuVxG22Ya7Wx+PJ3oIGggkoaVYa9UaEkiOYxWa2Ec2kdWodGYcNsakwHEhEDMcdMqcMySBw5O0xRc0Ck1i81ys0iMxohGpEEww0yBExwsHBWkAEgY42Z5CaA+ZgqYwGpFNIwIQxIwwgcHAXUCoA0uOdDrI3qBRoOSqAIjKYyiLtPOhiYmmlxxcazA4TnKUllTAMwBSKhaaIAGZkmhJmGXxdxOUsqYAgYKKMIVuLPGNBiKAioKwhW4uEWSLbJ1SxW4uEYRGMBZpH6LpolwiyRbZMKD2Al3SyoACXeTql6tpd0tKXhU1jC5S7pZUsyXhVzGFzF1i4JeFTWQMqQlFsi2yDzXZhcyEouUg8ptI1oonFsi2yKTLptcqEku6isptJ2kpCl3S8KYLqwCpihJQCoOrpkDSkTi/peFMFxY8uZFZB5IpnM40pL5AMg8oM/TwqZISkAyRS6p9wVAUJKQygz9QCsKiqg6mCy2uylQFFVFVYsCwEnMiagFSJZbLGlKBIrJjMRisBKZIrIPKDQM+suBVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vixAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

const getRadio = (id: AudioOutputId, label: AudioOutputLabel): HTMLElement => {
  const labelElem = document.createElement("label");
  const inputElem = document.createElement("input");
  inputElem.type = "radio";
  inputElem.name = "swal2-radio";
  inputElem.value = id;
  inputElem.oninput = () => {
    //@ts-ignore
    ctx.setSinkId(id);
  };
  const span = document.createElement("span");
  span.classList.add("swal2-label");
  span.innerText = label;
  labelElem.appendChild(inputElem);
  labelElem.appendChild(span);
  return labelElem;
};
const inputHTML = (inputOptions: MediaOptions): HTMLElement => {
  const container = document.createElement("div");
  container.classList.add("swal2-radio");
  container.id = "output-selector-container";
  for (let [id, label] of Object.entries(inputOptions)) {
    const radio = getRadio(id, label);
    container.appendChild(radio);
    container.appendChild(document.createElement("br"));
  }
  const testButton = getTestButton();
  container.appendChild(testButton);
  return container;
};

const soundOutputSetInBlock = (
  block: BlockId,
  reader: ParamReader,
): boolean => {
  const needSoundOutputKinds: String[] = reader.read(
    "needSoundOutputKind",
    block,
  );
  return needSoundOutputKinds.some((value) => value !== "");
};

const soundOutputSetInExperiment = (reader: ParamReader): boolean => {
  const blockCount = reader._blockCount as unknown as number;
  for (let i = 1; i <= blockCount; i++) {
    if (soundOutputSetInBlock(i, reader)) return true;
  }
  return false;
};

const getTestButton = (): HTMLButtonElement => {
  ctx = new AudioContext();
  const audioElement = document.createElement("audio");
  audioElement.id = "audio-output-selection-test-button";
  audioElement.src = testSound64;
  const track = ctx.createMediaElementSource(audioElement);
  track.connect(ctx.destination);
  const testButton = document.createElement("button");
  testButton.appendChild(audioElement);
  testButton.dataset.playing = "false";
  testButton.innerText = "Play a test sound.";
  testButton.onclick = () => {
    if (ctx.state === "suspended") ctx.resume();
    if (testButton.dataset.playing === "true") return;
    testButton.dataset.playing = "true";
    audioElement.play();
    testButton.innerText = "Playing!";
    audioElement.onended = () => {
      testButton.dataset.playing = "false";
      testButton.innerText = "Play a test sound.";
    };
  };
  return testButton;
};

const browserHasSoundOutputSelectionSupport = (): boolean => {
  return (
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.enumerateDevices !== "undefined" &&
    "setSinkId" in AudioContext.prototype
  );
};

export const checkBrowserSoundOutputSelectionSupport = (
  reader: ParamReader,
) => {
  if (
    soundOutputSetInExperiment(reader) &&
    !browserHasSoundOutputSelectionSupport()
  ) {
    // showBrowserNotSupportedPopup(); // TODO unnecessary?
    return false;
  }
  return true;
};
const showBrowserNotSupportedPopup = () => {
  Swal.fire({
    title: "Browser not supported.",
    text: "Due to technical limitations you will not be able to complete this experiment.",
    showCancelButton: false,
  });
  // TODO end the experiment?
};

const getAudioOutputOptions = async (): Promise<MediaOptions> => {
  const options: MediaOptions = {};
  // Using method a la components/useSoundCalibration/getUSBMicrophoneDetailsFromUser
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (stream) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(
      (device) =>
        device.kind === "audiooutput" && !device.label.includes("Default"),
    );
    for (const output of audioOutputs) {
      options[output.deviceId] = output.label;
    }
  }
  return options;
};

export const showAudioOutputSelectPopup = async (
  block: BlockId,
  reader: ParamReader,
  saveToOutputCSVFn: (label: string, value: any) => void,
  targetsToSetSink: any[],
) => {
  if (!soundOutputSetInBlock(block, reader)) return;
  if (!browserHasSoundOutputSelectionSupport()) {
    showBrowserNotSupportedPopup();
    return;
  }
  const getInput = (checked = true) =>
    document.querySelector(
      `input[name="swal2-radio"]${checked ? ":checked" : ""}`,
    ) as HTMLInputElement;
  let outputs = await getAudioOutputOptions();
  const { value: idSelected } = await Swal.fire<AudioOutputId>({
    title: "Select audio output",
    didOpen: () => {
      // Update list of options, if they have changed while the popup has be up
      navigator.mediaDevices.addEventListener("devicechange", async (event) => {
        if (!Swal.isVisible()) return;
        outputs = await getAudioOutputOptions();
        Swal.update({
          html: inputHTML(outputs),
        });
      });
      const input = document.getElementById("output-selector-container");
      if (input) {
      }
    },
    html: inputHTML(outputs),
    preConfirm: () => {
      const input = getInput();
      if (input === null) {
        Swal.showValidationMessage("Please select an audio output option.");
        return false;
      }
      return input.value;
    },

    allowOutsideClick: false,
  });
  if (idSelected) {
    const name = "" + idSelected + "-" + outputs[idSelected];
    saveToOutputCSVFn("selectedOutputDeviceName", name);
    broadcastSinkId(idSelected, targetsToSetSink);
  }
};

const broadcastSinkId = (id: AudioOutputId, targets: any[]) => {
  targets = targets.filter((o) => o && typeof o.setSinkId !== "undefined");
  targets.forEach((audioThing) => audioThing.setSinkId(id));
};
