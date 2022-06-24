import { invertedImpulseResponse } from "./global.js";

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Given an array of web audio nodes, builds the node graph in the order
 * they are placed into the array
 * @param {<AudioContext>} audioCtx the target audio context
 * @param {<AudioNode>} webAudioNodes the nodes !order matters!
 */
const connectAudioNodes = (audioCtx, webAudioNodes) => {
  let i = 0;
  let nextNode;
  let curNode;
  while (i < webAudioNodes.length - 1) {
    curNode = webAudioNodes[i];
    nextNode = webAudioNodes[i + 1];
    curNode.connect(nextNode);
    i++;
  }
  curNode = webAudioNodes[i];
  curNode.connect(audioCtx.destination);
};

/**
 * Given an audio context, a buffer containing audio, create an audio node containing the audio
 * @param {<AudioContext>} audioCtx the target audio context
 * @param {<AudioBuffer>} audioBuffer the audio data to be added to the node
 */
export const createAudioNodeFromBuffer = (audioBuffer) => {
  const node = audioCtx.createBufferSource();
  node.buffer = audioBuffer;
  return node;
};

/**
 * Creates a convolver node given the inverted Impulse Response
 * @param {<AudioContext>} audioCtx the target audio context
 * @param {Array.Float} invertedImpulseResponseBuffer the inverted impulse response
 * @returns
 */
export const createImpulseResponseFilterNode = async (
  invertedImpulseResponseBuffer
) => {
  const convolver = audioCtx.createConvolver();
  convolver.buffer = await audioCtx.decodeAudioData(
    invertedImpulseResponseBuffer
  );
  return convolver;
};

/**
 * Given an array of web audio nodes, connects them into a graph and plays the first
 * @param {Array.<AudioNode>} webAudioNodes an array containing a series of web audio nodes
 */
export const playAudioNodeGraph = (webAudioNodes) => {
  connectAudioNodes(webAudioNodes);
  const sourceNode = webAudioNodes[0];
  sourceNode.start();
};

/**
 * Given an buffer containing audio, creates an audio graph containing the audio and a convolver node which
 * accounts for the room's impulse response
 * @param {<AudioBuffer>[]} audioBuffer the audio data to be played
 */
export const playAudioBufferWithImpulseResponseCalibration = async (
  audioBuffer
) => {
  const webAudioNodes = [
    createAudioNodeFromBuffer(audioBuffer), // the audio to be played
    await createImpulseResponseFilterNode(), // the impulse response calibration node
  ];
  playAudioNodeGraph(webAudioNodes);
};
