import { RSVPReadingTargetSet, rsvpReadingTrialWords } from "./rsvpReading";
import type { Screen_ } from "./multiple-displays/globals";
import type { ParamReader } from "../parameters/paramReader";
import type { TextStim } from "./types";
import type { CharacterSetRect } from "./utils";
import type { VernierStim } from "./vernierStim";

// Experiment state, going into stimulus generation
export type State =
  | LetterState
  | RepeatedLettersState
  | RsvpReadingState
  | VernierState;
// What stage of the trial is this stim gen for?
// ie when final fixation position is not yet known, or once it is
type PartOfTrial = "beforeFixation" | "afterFixation";
// Output of stimulus generation
export type StimulusResults =
  | LetterStimulusResults
  | RepeatedLettersStimulusResults
  | RsvpReadingStimulusResults
  | VernierStimulusResults;
export type StimulusGenerationFailedInput =
  | StimulusGenerationFailedInputLetter
  | { error: Error };

// --- INPUT ---
export interface LetterState {
  proposedLevel: number; // Not actually used in EasyEyesLetterVersion == 2 beforeFixation
  characterSetBoundingRect: CharacterSetRect;
  textStims: TextStimsLetter;
  characters: CharactersLetter;
  stage?: PartOfTrial;
  frameN: number;
  t: number;
}
export interface RepeatedLettersState {
  proposedLevel: number;
  characterSetBoundingRect: CharacterSetRect;
}
export interface RsvpReadingState {
  thisTrialWords: rsvpReadingTrialWords;
  durationSec: number;
}
export interface VernierState {
  proposedLevel: number;
  vernier: VernierStim;
}

// --- OUTPUT ---
export interface LetterStimulusResults {
  level: number;
  stimulusParameters: any;
  stims: TextStimsLetter;
  // VERIFY only in EasyEyesLetterVersion == 2
  characterSetBoundingRect?: CharacterSetRect;
  letterTiming: any;
  preRenderFrameN: number;
}
export interface RepeatedLettersStimulusResults {
  stims: any[];
  level: number;
  stimulusParameters: any;
}

export interface RsvpReadingStimulusResults {
  targetSets: RSVPReadingTargetSet[];
}

export interface VernierStimulusResults {
  vernier: VernierStim;
}
export interface StimulusGenerationFailedInputLetter {
  error: Error;
  level: number;
  debug: boolean;
  screen: Screen_;
  block_condition: string;
  reader: ParamReader;
  characters: CharactersLetter;
  viewingDistanceCm: number;
}

export interface TextStimsLetter {
  target: TextStim;
  flanker1?: TextStim;
  flanker2?: TextStim;
  flanker3?: TextStim;
  flanker4?: TextStim;
}
export interface CharactersLetter {
  target: string;
  flanker1?: string;
  flanker2?: string;
  flanker3?: string;
  flanker4?: string;
}
