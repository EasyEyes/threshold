import { viewingDistanceCm } from "./global";

export const viewingDistanceOutOfBounds = (value, allowedRatio) => {
  const nominalViewingDistance = Math.min(
    viewingDistanceCm.desired,
    viewingDistanceCm.max,
  );
  let bounds;
  if (allowedRatio > 1) {
    bounds = [
      nominalViewingDistance / allowedRatio,
      nominalViewingDistance * allowedRatio,
    ];
  } else {
    bounds = [
      nominalViewingDistance * allowedRatio,
      nominalViewingDistance / allowedRatio,
    ];
  }
  return value < bounds[0] || value > bounds[1];
};
