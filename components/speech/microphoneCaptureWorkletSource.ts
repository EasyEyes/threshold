export const MICROPHONE_CAPTURE_WORKLET_SOURCE = `
class EasyEyesMicrophoneCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const configuredFrameSize = options.processorOptions?.frameSize;
    this.frameSize =
      Number.isInteger(configuredFrameSize) && configuredFrameSize > 0
        ? configuredFrameSize
        : 2048;
    this.frame = new Float32Array(this.frameSize);
    this.offset = 0;
    this.capturing = false;
    this.port.onmessage = (event) => {
      if (event.data?.type === "start") {
        this.frame = new Float32Array(this.frameSize);
        this.offset = 0;
        this.capturing = true;
      } else if (event.data?.type === "stop") {
        this.capturing = false;
        this.offset = 0;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (output) output.fill(0);
    if (!input || !this.capturing) return true;

    let inputOffset = 0;
    while (inputOffset < input.length) {
      const count = Math.min(
        input.length - inputOffset,
        this.frameSize - this.offset,
      );
      this.frame.set(input.subarray(inputOffset, inputOffset + count), this.offset);
      this.offset += count;
      inputOffset += count;

      if (this.offset === this.frameSize) {
        const completedFrame = this.frame;
        this.port.postMessage(completedFrame, [completedFrame.buffer]);
        this.frame = new Float32Array(this.frameSize);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor(
  "easyeyes-microphone-capture",
  EasyEyesMicrophoneCaptureProcessor,
);
`;
