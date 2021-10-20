import { visual, util } from "../psychojs/out/psychojs-2021.3.0.js";
import { degreesToPixels, pixelsToDegrees, XYPixOfXYDeg } from "./utils.js";

const opacity = 0.3;
/*
GRIDS. Participant page. 
For verification, provide optional grids over the whole screen. 
Parameter showGridsBool requests that threshold.js show buttons 
on the (lower) left of the screen that each turn on and off a 
different grid over the whole screen. Turning on several buttons 
should show several grids (in different dark colors). Each grid 
should be labeled  with numbers and units on the major axes.
The "cm" grid has cm units, origin in lower left, thick lines at
5 cm, and regular lines at 1 cm. The "deg" grid has deg units, 
origin at fixation, thick lines at 5 deg, and regular lines at 1 
deg. The "pix" grid has pix units, origin at lower left, thick 
lines at 500 pix, and regular lines at 100 pix.
*/

const getNumberOfGrids = (window, gridUnits, displayOptions) => {
  const dimensions = window._size;
  const dimensionsCm = dimensions.map((dim) => dim / displayOptions.pixPerCm);
  // TODO generalize to fixation != [0,0]
  const dimensionsDeg = dimensions.map((dim) =>
    pixelsToDegrees(Math.round(dim / 2), displayOptions)
  );
  switch (gridUnits) {
    case "pix":
      return dimensions.map((dim) => Math.floor(dim / 100) + 1);
    case "cm":
      return dimensionsCm.map((dim) => Math.floor(dim / 1) + 1);
    case "deg":
      return dimensionsDeg.map((dim) => Math.floor(dim / 1) + 1);
  }
};

export const getGridLines = (window, gridUnits, displayOptions) => {
  const dimensions = window._size;
  const widthCm = dimensions[0] / displayOptions.pixPerCm;
  const widthDeg = pixelsToDegrees(dimensions[0], displayOptions);
  switch (gridUnits) {
    case "pix":
      return getPixelGridLines(window, displayOptions);
    case "cm":
      return getCmGridLines(window, displayOptions);
    case "deg":
      return getDegGridLines(window, displayOptions);
  }
};

const getPixelGridLines = (window, displayOptions) => {
  const dimensions = window._size;
  const spacing = 100;
  const origin = [
    -Math.round(dimensions[0] / 2),
    -Math.round(dimensions[1] / 2),
  ];
  const numberOfGridLines = getNumberOfGrids(window, "pix", displayOptions);
  const verticalGridLines = [...Array(numberOfGridLines[0]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `vertical-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: opacity,
        vertices: [
          [+(origin[0] + lineId * spacing), +Math.round(dimensions[1] / 2)],
          [+(origin[0] + lineId * spacing), -Math.round(dimensions[1] / 2)],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const verticalGridLineLabels = [...Array(numberOfGridLines[0]).keys()].map(
    (lineId) => {
      return new visual.TextStim({
        name: `vertical-grid-line-label-${lineId}`,
        win: window,
        text: `${spacing * lineId} pix`,
        font: "Open Sans",
        units: "pix",
        pos: [30 + origin[0] + lineId * spacing, origin[1] + 15],
        height: 15,
        ori: 0.0,
        color: new util.Color("black"),
        opacity: opacity,
        depth: 0.0,
      });
    }
  );
  const horizontalGridLines = [...Array(numberOfGridLines[1]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `horizontal-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: opacity,
        vertices: [
          [+Math.round(dimensions[0] / 2), +(origin[1] + lineId * spacing)],
          [-Math.round(dimensions[0] / 2), +(origin[1] + lineId * spacing)],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const horizontalGridLineLabels = [...Array(numberOfGridLines[0]).keys()].map(
    (lineId) => {
      return new visual.TextStim({
        name: `horizontal-grid-line-label-${lineId}`,
        win: window,
        text: `${spacing * lineId} pix`,
        font: "Open Sans",
        units: "pix",
        pos: [origin[0] + 25, 20 + origin[1] + lineId * spacing],
        height: 15,
        ori: 0.0,
        color: new util.Color("black"),
        opacity: opacity,
        depth: 0.0,
      });
    }
  );
  return [
    ...verticalGridLines,
    ...verticalGridLineLabels,
    ...horizontalGridLines,
    ...horizontalGridLineLabels,
  ];
};

const getCmGridLines = (window, displayOptions) => {
  const dimensions = window._size;
  const spacing = displayOptions.pixPerCm;
  const origin = [
    -Math.round(dimensions[0] / 2),
    -Math.round(dimensions[1] / 2),
  ];
  const numberOfGridLines = getNumberOfGrids(window, "cm", displayOptions);
  const verticalGridLines = [...Array(numberOfGridLines[0]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `vertical-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: 1.0,
        vertices: [
          [+(origin[0] + lineId * spacing), +Math.round(dimensions[1] / 2)],
          [+(origin[0] + lineId * spacing), -Math.round(dimensions[1] / 2)],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const verticalGridLineLabels = [...Array(numberOfGridLines[0]).keys()].map(
    (lineId) => {
      return new visual.TextStim({
        name: `vertical-grid-line-label-${lineId}`,
        win: window,
        text: `${lineId} cm`,
        font: "Open Sans",
        units: "pix",
        pos: [30 + origin[0] + lineId * spacing, origin[1] + 15],
        height: 15,
        ori: 0.0,
        color: new util.Color("black"),
        opacity: 1.0,
        depth: 0.0,
      });
    }
  );
  const horizontalGridLines = [...Array(numberOfGridLines[1]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `horizontal-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: 1.0,
        vertices: [
          [+Math.round(dimensions[0] / 2), +(origin[1] + lineId * spacing)],
          [-Math.round(dimensions[0] / 2), +(origin[1] + lineId * spacing)],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const horizontalGridLineLabels = [...Array(numberOfGridLines[0]).keys()].map(
    (lineId) => {
      return new visual.TextStim({
        name: `horizontal-grid-line-label-${lineId}`,
        win: window,
        text: `${lineId} cm`,
        font: "Open Sans",
        units: "pix",
        pos: [origin[0] + 25, 20 + origin[1] + lineId * spacing],
        height: 15,
        ori: 0.0,
        color: new util.Color("black"),
        opacity: 1.0,
        depth: 0.0,
      });
    }
  );
  return [
    ...verticalGridLines,
    ...verticalGridLineLabels,
    ...horizontalGridLines,
    ...horizontalGridLineLabels,
  ];
};

const getDegGridLines = (window, displayOptions) => {
  const dimensions = window._size;
  const origin = displayOptions.fixationXYPix;
  const numberOfGridLinesPerSide = getNumberOfGrids(
    window,
    "deg",
    displayOptions
  );
  const rightGridLines = [...Array(numberOfGridLinesPerSide[0]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `right-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: opacity,
        vertices: [
          [
            +(origin[0] + degreesToPixels(lineId, displayOptions)),
            +Math.round(dimensions[1] / 2),
          ],
          [
            +(origin[0] + degreesToPixels(lineId, displayOptions)),
            -Math.round(dimensions[1] / 2),
          ],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const leftGridLines = [...Array(numberOfGridLinesPerSide[0]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `left-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: opacity,
        vertices: [
          [
            -(origin[0] + degreesToPixels(lineId, displayOptions)),
            +Math.round(dimensions[1] / 2),
          ],
          [
            -(origin[0] + degreesToPixels(lineId, displayOptions)),
            -Math.round(dimensions[1] / 2),
          ],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const upperGridLines = [...Array(numberOfGridLinesPerSide[1]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `upper-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: opacity,
        vertices: [
          [
            +Math.round(dimensions[0] / 2),
            +(origin[1] + degreesToPixels(lineId, displayOptions)),
          ],
          [
            -Math.round(dimensions[0] / 2),
            +(origin[1] + degreesToPixels(lineId, displayOptions)),
          ],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const lowerGridLines = [...Array(numberOfGridLinesPerSide[1]).keys()].map(
    (lineId) => {
      return new visual.ShapeStim({
        name: `lower-grid-line-${lineId}`,
        win: window,
        units: "pix",
        lineWidth: lineId % 5 === 0 ? 5 : 2,
        lineColor: new util.Color("black"),
        fillColor: new util.Color("black"),
        opacity: opacity,
        vertices: [
          [
            +Math.round(dimensions[0] / 2),
            -(origin[1] + degreesToPixels(lineId, displayOptions)),
          ],
          [
            -Math.round(dimensions[0] / 2),
            -(origin[1] + degreesToPixels(lineId, displayOptions)),
          ],
        ],
        depth: -1000,
        ori: 0.0,
        interpolate: false,
        size: 1,
      });
    }
  );
  const rightGridLineLabels = [...Array(numberOfGridLinesPerSide[0]).keys()]
    .filter((lineId) => lineId % 5 === 0)
    .map((lineId) => {
      return new visual.TextStim({
        name: `right-grid-line-label-${lineId}`,
        win: window,
        text: `${lineId} deg`,
        font: "Open Sans",
        units: "pix",
        pos: [
          origin[0] + degreesToPixels(lineId, displayOptions) - 5,
          -(window._size[1] / 2) + degreesToPixels(0.25, displayOptions),
        ],
        height: Math.round(degreesToPixels(0.5, displayOptions)),
        ori: 0.0,
        color: new util.Color("red"),
        opacity: 1.0,
        depth: 0.0,
      });
    });
  const leftGridLineLabels = [...Array(numberOfGridLinesPerSide[0]).keys()]
    .filter((lineId) => lineId % 5 === 0 && lineId !== 0)
    .map((lineId) => {
      return new visual.TextStim({
        name: `left-grid-line-label-${lineId}`,
        win: window,
        text: `-${lineId} deg`,
        font: "Open Sans",
        units: "pix",
        pos: [
          origin[0] - degreesToPixels(lineId, displayOptions) + 5,
          -(window._size[1] / 2) + degreesToPixels(0.25, displayOptions),
        ],
        height: Math.round(degreesToPixels(0.5, displayOptions)),
        ori: 0.0,
        color: new util.Color("red"),
        opacity: 1.0,
        depth: 0.0,
      });
    });
  const lowerGridLineLabels = [...Array(numberOfGridLinesPerSide[0]).keys()]
    .filter((lineId) => lineId % 5 === 0 && lineId !== 0)
    .map((lineId) => {
      return new visual.TextStim({
        name: `lower-grid-line-label-${lineId}`,
        win: window,
        text: `-${lineId} deg`,
        font: "Open Sans",
        units: "pix",
        pos: [
          -(window._size[0] / 2) + degreesToPixels(0.75, displayOptions),
          origin[1] - degreesToPixels(lineId, displayOptions) + 5,
        ],
        height: Math.round(degreesToPixels(0.5, displayOptions)),
        ori: 0.0,
        color: new util.Color("red"),
        opacity: 1.0,
        depth: 0.0,
      });
    });
  const upperGridLineLabels = [...Array(numberOfGridLinesPerSide[0]).keys()]
    .filter((lineId) => lineId % 5 === 0)
    .map((lineId) => {
      return new visual.TextStim({
        name: `upper-grid-line-label-${lineId}`,
        win: window,
        text: `${lineId} deg`,
        font: "Open Sans",
        units: "pix",
        pos: [
          -(window._size[0] / 2) + degreesToPixels(0.75, displayOptions),
          origin[1] + degreesToPixels(lineId, displayOptions) - 5,
        ],
        height: Math.round(degreesToPixels(0.5, displayOptions)),
        ori: 0.0,
        color: new util.Color("red"),
        opacity: 1.0,
        depth: 0.0,
      });
    });
  return [
    ...rightGridLines,
    ...leftGridLines,
    ...upperGridLines,
    ...lowerGridLines,
    ...rightGridLineLabels,
    ...leftGridLineLabels,
    ...upperGridLineLabels,
    ...lowerGridLineLabels,
  ];
  // const horizontalGridLines = [...Array(numberOfGridLines[1]).keys()].map(lineId => {
  //     return new visual.ShapeStim({
  //         name: `horizontal-grid-line-${lineId}`,
  //         win: window,
  //         units: "pix",
  //         lineWidth: ((lineId%5) === 0) ? 5 : 2,
  //         lineColor: new util.Color("black"),
  //         fillColor: new util.Color("black"),
  //         opacity: 1.0,
  //         vertices: [[+Math.round(dimensions[0]/2),+(origin[1]+(lineId*spacing))],
  //                    [-Math.round(dimensions[0]/2),+(origin[1]+(lineId*spacing))]],
  //         depth: -1000,
  //         ori: 0.0,
  //         interpolate: false,
  //         size: 1,
  //     });
  // });
  // const horizontalGridLineLabels = [...Array(numberOfGridLines[0]).keys()].map(lineId => {
  //     return new visual.TextStim({
  //         name: `horizontal-grid-line-label-${lineId}`,
  //         win: window,
  //         text: `${lineId} cm`,
  //         font: "Open Sans",
  //         units: "pix",
  //         pos: [origin[0]+25, (20+origin[1]+(lineId*spacing))],
  //         height: 15,
  //         ori: 0.0,
  //         color: new util.Color("black"),
  //         opacity: 1.0,
  //         depth: 0.0,
  //     });
  // });
  // return [...verticalGridLines, ...verticalGridLineLabels, ...horizontalGridLines, ...horizontalGridLineLabels];
};
