export const getFixationVerticies = (strokeLength) => {
  const half = Math.round(strokeLength / 2);
  return [
    [-half, 0],
    [0, 0],
    [half, 0],
    [0, 0],
    [0, -half],
    [0, 0],
    [0, half],
  ];
};
