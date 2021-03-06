/**
 * responseType
 *      click   type    keypad    speak
 * 0    x       o       x         x
 * 1    o       x       x         x
 * 2    o       o       x         x
 * 3
 * 4
 * 5
 * 6
 * 7
 * 8
 * 9
 * 10
 * 11
 * 12
 * 13
 * 14
 * 15
 */

export const _responseTypes = {
  // [click, type, keypad, speak]
  0: [false, true, false, false],
  1: [true, false, false, false],
  2: [true, true, false, false],
};

export const getResponseType = (
  click,
  type,
  keypad,
  speak,
  mustClickCrosshairForResponse
) => {
  // responseMustClickCrosshairBool
  if (mustClickCrosshairForResponse) return 1;

  // Default routine
  const c = click,
    t = type,
    k = keypad,
    s = speak;
  if (!c && t && !k && !s) return 0;
  else if (c && !t && !k && !s) return 1;
  else if (c && t && !k && !s) return 2;
  else return 1;
  // TODO finish other situations
};

export const resetResponseType = (
  originalResponseType,
  responseType,
  mustClickCrosshairForResponse
) => {
  if (mustClickCrosshairForResponse) return originalResponseType;
  else return responseType;
};

/* -------------------------------------------------------------------------- */

export const canType = (responseType) => {
  return _responseTypes[responseType][1];
};

export const canClick = (responseType) => {
  return _responseTypes[responseType][0];
};

/* -------------------------------------------------------------------------- */

export const _onlyClick = (responseType) => {
  const types = _responseTypes[responseType];
  return types[0] && !types[1] && !types[2] && !types[3];
};
