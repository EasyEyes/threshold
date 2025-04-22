import { Chart } from "chart.js/auto";
import {
  SoundLevelModel,
  display1000HzParametersTable,
  displaySummarizedTransducerTable,
} from "./soundTest";
import {
  calibrateSound1000HzPostSec,
  calibrateSound1000HzPreSec,
  calibrateSound1000HzSec,
  calibrateSoundBurstDb,
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundHz,
  calibrateSoundIRSec,
  calibrateSoundIIRSec,
  calibrateSoundMaxHz,
  calibrateSoundMinHz,
  calibrateSoundSmoothOctaves,
  calibrateSoundBurstLevelReTBool,
  fMaxHz,
  attenuatorGainDB,
  loudspeakerInfo,
  microphoneInfo,
  qualityMetrics,
  showSoundParametersBool,
  filteredMLSAttenuation,
  calibrateSoundBurstScalarDB,
  sdOfRecordingOfFilteredMLS,
  calibrateSoundBurstDownsample,
} from "./global";
import {
  findGainatFrequency,
  findMinValue,
  findMaxValue,
  safeMin,
  safeMax,
  saveSD_GAIN_info,
} from "./soundCalibrationHelpers";

export const plotSoundLevels1000Hz = (
  plotCanvas,
  parameters,
  soundLevels,
  outDBSPL1000Values,
  title,
  calibrationGoal,
  isLoudspeakerCalibration,
  position = "left",
) => {
  const subtitleText =
    calibrationGoal === "system"
      ? "Loudspeaker + Microphone"
      : isLoudspeakerCalibration
      ? "Loudspeaker"
      : "Microphone";
  const mergedDataPoints = soundLevels.map((x, i) => {
    return { x: x, y: outDBSPL1000Values[i] };
  });
  // sort the data points by x
  mergedDataPoints.sort((a, b) => a.x - b.x);

  // model should start from min of soundLevels and end at max of soundLevels with 0.1 interval
  const model = [];
  const gainDBSPL = Math.round(microphoneInfo.current.gainDBSPL * 10) / 10;
  const modelWithOutBackground = [];
  const minM = safeMin(...soundLevels);
  const maxM = safeMax(...soundLevels);

  for (let i = minM; i <= maxM; i += 0.1) {
    model.push({
      x: i,
      y: SoundLevelModel(
        Number(i),
        parameters.backgroundDBSPL,
        parameters.gainDBSPL,
        parameters.T,
        parameters.W,
        parameters.R,
      ),
    });
    modelWithOutBackground.push({
      x: i,
      y: SoundLevelModel(
        Number(i),
        -Infinity,
        parameters.gainDBSPL,
        parameters.T,
        parameters.W,
        parameters.R,
      ),
    });
  }
  // sort the data points by x
  model.sort((a, b) => a.x - b.x);
  // sort the data points by x
  modelWithOutBackground.sort((a, b) => a.x - b.x);

  let minY =
    Math.floor(
      safeMin(
        ...outDBSPL1000Values,
        ...model.map((point) => point.y),
        ...modelWithOutBackground.map((point) => point.y),
      ) / 10,
    ) *
      10 -
    Math.round(gainDBSPL * 10) / 10;
  minY = Math.round(minY * 10) / 10;
  let maxY =
    Math.ceil(
      safeMax(
        ...outDBSPL1000Values,
        ...model.map((point) => point.y),
        ...modelWithOutBackground.map((point) => point.y),
      ) / 10,
    ) *
      10 -
    Math.round(gainDBSPL * 10) / 10;

  maxY = Math.round(maxY * 10) / 10;
  console.log("minY", minY, "maxY", maxY);

  // plot both the data points (dot) and the model (line)
  const data = {
    datasets: [
      {
        label: "Data",
        data: mergedDataPoints,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
        yAxisID: "y",
      },
      {
        label: "Model",
        data: model,
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 2,
        showLine: true,
        tension: 0.1,
        yAxisID: "y",
      },
      {
        type: "line",
        label: "Model without background",
        data: modelWithOutBackground,
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 2,
        showLine: true,
        borderDash: [2, 3],
        tension: 0.1,
        yAxisID: "y",
      },
    ],
  };

  var inDBUnits = "";
  var outDBUnits = "";
  if (calibrationGoal === "system") {
    inDBUnits = "dB";
    outDBUnits = "dB";
  } else {
    inDBUnits = isLoudspeakerCalibration ? "dB" : "dB SPL";
    outDBUnits = isLoudspeakerCalibration ? "dB SPL" : "dB";
  }
  const config = {
    type: "scatter",
    data: data,
    options: {
      responsive: false,
      // aspectRatio : 1,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 22,
            weight: "normal",
            family: "system-ui",
          },
        },
        subtitle: {
          display: true,
          text: subtitleText,
          font: {
            size: 19,
            family: "system-ui",
          },
          align: "center",
        },
        legend: {
          labels: {
            font: {
              size: 15,
            },
            usePointStyle: true,
            generateLabels: function (chart) {
              const data = chart.data;
              if (data.datasets.length) {
                return data.datasets.map(function (dataset, i) {
                  return {
                    text: dataset.label,
                    fillStyle: dataset.backgroundColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: dataset.borderWidth,
                    hidden: !chart.isDatasetVisible(i),
                    index: i,
                    lineDash: dataset.borderDash,
                    pointStyle: "line",
                  };
                });
              }
              return [];
            },
          },
        },
      },
      // x and y should have the same length in terms of pixels on the screen
      // this is done by adjusting the ticks of the x and y axis based on the min and max of the data points
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: {
            display: true,
            text: `Input level (${inDBUnits})`,
            font: {
              size: "19px",
            },
          },
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
          },
        },
        y1: {
          type: "linear",
          position: "right",
          display: true,
          min: minY,
          max: maxY,
          title: {
            display: true,
            text: `Estimated sound level (dB SPL)`,
            font: {
              size: "19px",
            },
          },
          grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
            callback: function (value, index, values) {
              return value.toFixed(1); // Enforce one decimal place
            },
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: `Output level (${outDBUnits})`,
            font: {
              size: "19px",
            },
          },
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
          },
        },
      },
    },
  };
  const plot = new Chart(plotCanvas, config);
  const table = displaySummarizedTransducerTable(
    loudspeakerInfo.current,
    microphoneInfo.current,
    "",
    isLoudspeakerCalibration,
    calibrationGoal,
    "",
    [calibrateSoundHz.current, calibrateSoundHz.current],
  );

  // add the table to the lower right of the canvas. Adjust the position of the table based on the canvas size
  const chartArea = plot.chartArea;
  const tableDiv = document.createElement("div");
  tableDiv.style.position = "absolute";
  tableDiv.appendChild(table);
  if (showSoundParametersBool.current) {
    const p = document.createElement("p");
    const reportParameters = `1000 Hz duration: pre ${calibrateSound1000HzPreSec.current} s, use ${calibrateSound1000HzSec.current} s, post ${calibrateSound1000HzPostSec.current} s`;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    p.style.userSelect = "text";
    tableDiv.appendChild(p);

    const parametersTable = display1000HzParametersTable(parameters);
    const parametersTableDiv = document.createElement("div");
    parametersTableDiv.style.position = "absolute";
    parametersTableDiv.appendChild(parametersTable);
    plotCanvas.parentNode.appendChild(parametersTableDiv);
    parametersTableDiv.style.marginLeft = chartArea.left + 3 + "px";
    parametersTableDiv.style.marginTop =
      -(chartArea.height + chartArea.top - 40) + "px";
  }
  plotCanvas.parentNode.appendChild(tableDiv);
  const tableRec = tableDiv.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.top + tableRec.height - 44) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";

  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
};

export const plotForAllHz = (
  plotCanvas,
  calibrationResults,
  title,
  calibrationGoal,
  isLoudspeakerCalibration,
  backgroundNoise = {},
  mls_psd = {},
  microphoneGain = { Freq: [], Gain: [] },
  filteredMLSRange,
  parameters,
) => {
  const subtitleText =
    calibrationGoal === "system"
      ? "Loudspeaker + Microphone"
      : isLoudspeakerCalibration
      ? "Loudspeaker"
      : "Microphone";
  const unconvMergedDataPoints = calibrationResults.psd.unconv.x
    .filter((x) => x <= 20000)
    .map((x, i) => {
      return { x: x, y: 10 * Math.log10(calibrationResults.psd.unconv.y[i]) };
    });

  const convMergedDataPoints = calibrationResults.psd.conv.x
    .filter((x) => x <= 20000)
    .map((x, i) => {
      return { x: x, y: 10 * Math.log10(calibrationResults.psd.conv.y[i]) };
    });

  const attenuatedBackgroundNoise = calibrationResults.background_noise;

  const backgroundMergedDataPoints = attenuatedBackgroundNoise.x_background
    ? attenuatedBackgroundNoise.x_background
        .filter((x) => x <= 20000)
        .map((x, i) => {
          return {
            x: x,
            y: 10 * Math.log10(attenuatedBackgroundNoise.y_background[i]),
          };
        })
    : [];

  const digitalMLSPoints = mls_psd.x
    ? mls_psd.x
        .filter((x) => x <= 20000)
        .map((x, i) => {
          return { x: x, y: 10 * Math.log10(mls_psd.y[i]) };
        })
    : [];

  const filteredDigitalMLSPoints = calibrationResults.filtered_mls_psd.x
    ? calibrationResults.filtered_mls_psd.x
        .filter((x) => x <= 20000)
        .map((x, i) => {
          return {
            x: x,
            y: 10 * Math.log10(calibrationResults.filtered_mls_psd.y[i]),
          };
        })
    : [];
  const microphoneGainPoints =
    microphoneGain.Freq.length > 0
      ? microphoneGain.Freq.filter((x) => x <= 20000).map((x, i) => {
          return { x: x, y: microphoneGain.Gain[i] };
        })
      : [];

  // expected correction is the sum of the recording of MLS and the filtered MLS
  const expectedCorrectionPoints = [];
  if (filteredDigitalMLSPoints.length > 0) {
    for (let i = 0; i < filteredDigitalMLSPoints.length; i++) {
      const backgroundNoiseValue = attenuatedBackgroundNoise.y_background
        ? attenuatedBackgroundNoise.y_background[i]
        : 0;
      const yValue =
        10 *
        Math.log10(
          safeMax(
            0,
            calibrationResults.psd.unconv.y[i] - backgroundNoiseValue,
          ) * calibrationResults.filtered_mls_psd.y[i],
        );

      if (isFinite(yValue)) {
        expectedCorrectionPoints.push({
          x: filteredDigitalMLSPoints[i].x,
          y: yValue,
        });
      }
    }
  }

  // if calibration goal == system and isLoudspeakerCalibration ==true, then subtract microphone gain from conv, unconv, and background
  if (calibrationGoal === "goal") {
    // console.log(microphoneGainPoints, convMergedDataPoints, unconvMergedDataPoints, backgroundMergedDataPoints);
    // const conv_subtractedGain = interpolateGain(microphoneGainPoints,convMergedDataPoints)
    // console.log(conv_subtractedGain);
    const microphoneGainFreq = microphoneGainPoints.map((point) => point.x);
    const microphoneGainGain = microphoneGainPoints.map((point) => point.y);
    convMergedDataPoints.forEach((point, i) => {
      convMergedDataPoints[i].y =
        convMergedDataPoints[i].y -
        findGainatFrequency(
          microphoneGainFreq,
          microphoneGainGain,
          convMergedDataPoints[i].x,
        );
    });

    unconvMergedDataPoints.forEach((point, i) => {
      unconvMergedDataPoints[i].y =
        unconvMergedDataPoints[i].y -
        findGainatFrequency(
          microphoneGainFreq,
          microphoneGainGain,
          unconvMergedDataPoints[i].x,
        );
    });

    backgroundMergedDataPoints.forEach((point, i) => {
      backgroundMergedDataPoints[i].y =
        backgroundMergedDataPoints[i].y -
        findGainatFrequency(
          microphoneGainFreq,
          microphoneGainGain,
          backgroundMergedDataPoints[i].x,
        );
    });

    expectedCorrectionPoints.forEach((point, i) => {
      expectedCorrectionPoints[i].y =
        expectedCorrectionPoints[i].y -
        findGainatFrequency(
          microphoneGainFreq,
          microphoneGainGain,
          expectedCorrectionPoints[i].x,
        );
    });
  }

  // sort the data points by x
  // unconvMergedDataPoints.sort((a, b) => a.x - b.x);
  // convMergedDataPoints.sort((a, b) => a.x - b.x);
  // backgroundMergedDataPoints.sort((a, b) => a.x - b.x);

  const datasets = [
    {
      label: "Recording of MLS",
      data: unconvMergedDataPoints,
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderColor: "rgba(255, 99, 132, 1)",
      borderWidth: 2,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
    },
    {
      label: "Recording of filtered MLS",
      data: convMergedDataPoints,
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgba(54, 162, 235, 1)",
      borderWidth: 2,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
    },
  ];

  if (backgroundMergedDataPoints.length > 0) {
    datasets.push({
      label: "Recording of background",
      data: backgroundMergedDataPoints,
      backgroundColor: "rgba(200, 200, 200, 0.2)",
      borderColor: "rgba(200, 200, 200, 1)",
      borderWidth: 2,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
    });
  }
  if (filteredDigitalMLSPoints.length > 0) {
    datasets.push({
      label: "Filtered MLS",
      data: filteredDigitalMLSPoints,
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgba(54, 162, 235, 1)",
      borderWidth: 2,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
      borderDash: [2, 3],
    });
  }
  if (digitalMLSPoints.length > 0) {
    datasets.push({
      label: "MLS",
      data: digitalMLSPoints,
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderColor: "rgba(255, 99, 132, 1)",
      borderWidth: 2,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
      borderDash: [2, 3],
    });
  }
  // black dashed line for microphone gain
  if (microphoneGainPoints.length > 0 && calibrationGoal === "goal") {
    datasets.push({
      label: isLoudspeakerCalibration ? "Microphone gain" : "Loudspeaker gain",
      data: microphoneGainPoints,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderColor: "rgba(0, 0, 0, 1)",
      borderWidth: 2,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
      borderDash: [2, 3],
    });
  }

  // solid purple line for expected correction
  if (expectedCorrectionPoints.length > 0) {
    datasets.push({
      label: "Predicted correction",
      data: expectedCorrectionPoints,
      backgroundColor: "rgba(128, 0, 128, 0.2)",
      borderColor: "rgba(128, 0, 128, 1)",
      borderWidth: 2,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
    });
  }

  const data = {
    datasets: datasets,
  };

  // find the max of the y values
  let maxY;
  if (calibrationGoal !== "system") {
    maxY = safeMax(
      ...unconvMergedDataPoints.map((point) => point.y),
      ...convMergedDataPoints.map((point) => point.y),
      ...backgroundMergedDataPoints.map((point) => point.y),
      ...digitalMLSPoints.map((point) => point.y),
      ...filteredDigitalMLSPoints.map((point) => point.y),
      ...microphoneGainPoints.map((point) => point.y),
      ...expectedCorrectionPoints.map((point) => point.y),
    );
  } else {
    maxY = safeMax(
      ...unconvMergedDataPoints.map((point) => point.y),
      ...convMergedDataPoints.map((point) => point.y),
      ...backgroundMergedDataPoints.map((point) => point.y),
      ...digitalMLSPoints.map((point) => point.y),
      ...filteredDigitalMLSPoints.map((point) => point.y),
      ...expectedCorrectionPoints.map((point) => point.y),
    );
  }

  let minYAt1000Hz;
  if (calibrationGoal !== "system") {
    // minY = Math.min(
    //   ...unconvMergedDataPoints.map((point) => point.y),
    //   ...convMergedDataPoints.map((point) => point.y),
    //   ...backgroundMergedDataPoints.map((point) => point.y),
    //   ...digitalMLSPoints.map((point) => point.y),
    //   ...filteredDigitalMLSPoints.map((point) => point.y),
    //   ...microphoneGainPoints.map((point) => point.y),
    //   ...expectedCorrectionPoints.map((point) => point.y)
    // );
    const gainAt1000Hz_unconv = findGainatFrequency(
      unconvMergedDataPoints.map((point) => point.x),
      unconvMergedDataPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_conv = findGainatFrequency(
      convMergedDataPoints.map((point) => point.x),
      convMergedDataPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_background = findGainatFrequency(
      backgroundMergedDataPoints.map((point) => point.x),
      backgroundMergedDataPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_digitalMLS = findGainatFrequency(
      digitalMLSPoints.map((point) => point.x),
      digitalMLSPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_filteredDigitalMLS = findGainatFrequency(
      filteredDigitalMLSPoints.map((point) => point.x),
      filteredDigitalMLSPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_microphoneGain = findGainatFrequency(
      microphoneGainPoints.map((point) => point.x),
      microphoneGainPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_expectedCorrection = findGainatFrequency(
      expectedCorrectionPoints.map((point) => point.x),
      expectedCorrectionPoints.map((point) => point.y),
      1000,
    );

    console.log({
      gainAt1000Hz_unconv: gainAt1000Hz_unconv,
      gainAt1000Hz_conv: gainAt1000Hz_conv,
      gainAt1000Hz_background: gainAt1000Hz_background,
      gainAt1000Hz_digitalMLS: gainAt1000Hz_digitalMLS,
      gainAt1000Hz_filteredDigitalMLS: gainAt1000Hz_filteredDigitalMLS,
      gainAt1000Hz_microphoneGain: gainAt1000Hz_microphoneGain,
      gainAt1000Hz_expectedCorrection: gainAt1000Hz_expectedCorrection,
    });

    minYAt1000Hz = safeMin(
      gainAt1000Hz_unconv,
      gainAt1000Hz_conv,
      gainAt1000Hz_background,
      gainAt1000Hz_digitalMLS,
      gainAt1000Hz_filteredDigitalMLS,
      gainAt1000Hz_microphoneGain,
      gainAt1000Hz_expectedCorrection,
    );
  } else {
    // minY = Math.min(
    //   ...unconvMergedDataPoints.map((point) => point.y),
    //   ...convMergedDataPoints.map((point) => point.y),
    //   ...backgroundMergedDataPoints.map((point) => point.y),
    //   ...digitalMLSPoints.map((point) => point.y),
    //   ...filteredDigitalMLSPoints.map((point) => point.y),
    //   ...expectedCorrectionPoints.map((point) => point.y)
    // );
    const gainAt1000Hz_unconv = findGainatFrequency(
      unconvMergedDataPoints.map((point) => point.x),
      unconvMergedDataPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_conv = findGainatFrequency(
      convMergedDataPoints.map((point) => point.x),
      convMergedDataPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_background = findGainatFrequency(
      backgroundMergedDataPoints.map((point) => point.x),
      backgroundMergedDataPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_digitalMLS = findGainatFrequency(
      digitalMLSPoints.map((point) => point.x),
      digitalMLSPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_filteredDigitalMLS = findGainatFrequency(
      filteredDigitalMLSPoints.map((point) => point.x),
      filteredDigitalMLSPoints.map((point) => point.y),
      1000,
    );
    const gainAt1000Hz_expectedCorrection = findGainatFrequency(
      expectedCorrectionPoints.map((point) => point.x),
      expectedCorrectionPoints.map((point) => point.y),
      1000,
    );
    minYAt1000Hz = safeMin(
      gainAt1000Hz_unconv,
      gainAt1000Hz_conv,
      gainAt1000Hz_background,
      gainAt1000Hz_digitalMLS,
      gainAt1000Hz_filteredDigitalMLS,
      gainAt1000Hz_expectedCorrection,
    );
  }
  // round down minYAt1000Hz to the nearest 10
  const lowerEnd = Math.floor((minYAt1000Hz - 55) / 10) * 10;
  // const lowerEnd = Math.floor(minY / 10) * 10 - 50;

  // min = -130 max = maxY + 10, stepSize = 10. Set the plotCanvas Height based on the max and min. Every 10 dB is 40 pixels
  const plotCanvasHeight = (maxY - lowerEnd) * 6;
  plotCanvas.height = plotCanvasHeight;
  plotCanvas.width = 600;

  const plugin = {
    id: "customHTMLonCanvas",
    // afterDraw: (chart) => {
    //   const table = displaySummarizedTransducerTable(
    //     loudspeakerInfo.current, microphoneInfo.current,"",isLoudspeakerCalibration,calibrationGoal,"");
    //   const canvas = chart.canvas;
    //   drawTableOnCanvas(table, canvas);
    // }
  };

  const config = {
    type: "line",
    data: data,
    options: {
      responsive: false,
      // aspectRatio : 1,
      plugins: {
        title: {
          display: true,
          text: subtitleText + " " + title,
          font: {
            size: 22,
            weight: "normal",
            family: "system-ui",
          },
        },
        legend: {
          labels: {
            font: {
              size: 15,
            },
            usePointStyle: true,
            generateLabels: function (chart) {
              const data = chart.data;
              if (data.datasets.length) {
                return data.datasets.map(function (dataset, i) {
                  return {
                    text: dataset.label,
                    fillStyle: dataset.backgroundColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: dataset.borderWidth,
                    hidden: !chart.isDatasetVisible(i),
                    index: i,
                    lineDash: dataset.borderDash,
                    pointStyle: "line",
                  };
                });
              }
              return [];
            },
          },
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          position: "bottom",
          title: {
            display: true,
            text: "Frequency (Hz)",
            font: {
              size: "19px",
            },
          },
          min: 20,
          max: 20000,
          ticks: {
            callback: function (value, index, values) {
              const tickValues = [
                20, 100, 200, 1000, 2000, 10000, 16000, 20000,
              ];
              return tickValues.includes(value) ? value : "";
            },
            font: {
              size: 15,
            },
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Power spectral density (dB)",
            font: {
              size: "19px",
            },
          },
          min: lowerEnd,
          max: Math.ceil(maxY / 10) * 10 + 10,
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
          },
        },
      },
    },
    plugins: [plugin],
  };

  const plot = new Chart(plotCanvas, config);
  const chartArea = plot.chartArea;
  const table = displaySummarizedTransducerTable(
    loudspeakerInfo.current,
    microphoneInfo.current,
    "",
    isLoudspeakerCalibration,
    calibrationGoal,
    "",
    [calibrateSoundHz.current, calibrateSoundHz.current],
  );

  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.style.lineHeight = "1";
  const maxHz = calibrationGoal === "goal" ? fMaxHz.component : fMaxHz.system;
  const attenuatorGain =
    calibrationGoal === "goal"
      ? attenuatorGainDB.component
      : attenuatorGainDB.system;
  if (showSoundParametersBool.current) {
    const filteredDataPoints = convMergedDataPoints.filter(
      (point) => point.x >= calibrateSoundMinHz.current && point.x <= maxHz,
    );
    const unconv = unconvMergedDataPoints
      .filter(
        (point) => point.x >= calibrateSoundMinHz.current && point.x <= maxHz,
      )
      .map((point) => point.y);
    const sdUnconv = standardDeviation(unconv);

    const MLS = digitalMLSPoints
      .filter(
        (point) => point.x >= calibrateSoundMinHz.current && point.x <= maxHz,
      )
      .map((point) => point.y);
    const sdMLS = standardDeviation(MLS);

    const filteredDataPointsY = filteredDataPoints.map((point) => point.y);
    const sd = standardDeviation(filteredDataPointsY);
    sdOfRecordingOfFilteredMLS.current = sd;

    const filteredExpectedCorrectionPoints = expectedCorrectionPoints.filter(
      (point) => point.x >= calibrateSoundMinHz.current && point.x <= maxHz,
    );
    const filteredExpectedCorrectionPointsY =
      filteredExpectedCorrectionPoints.map((point) => point.y);
    const sdExpectedCorrection = standardDeviation(
      filteredExpectedCorrectionPointsY,
    );

    const p = document.createElement("p");

    const reportParameters = `SD (dB): red - - ${sdMLS}, red — ${sdUnconv}, purple — ${sdExpectedCorrection}, blue — ${sd}, ${calibrateSoundMinHz.current}–${maxHz} Hz`;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    p.style.userSelect = "text";
    tableDiv.appendChild(p);
  }
  tableDiv.appendChild(table);
  if (showSoundParametersBool.current) {
    const maxAbs =
      calibrationGoal === "system"
        ? filteredMLSAttenuation.maxAbsSystem
        : filteredMLSAttenuation.maxAbsComponent;

    const amplitude = (Math.round(maxAbs * 10) / 10).toFixed(1);
    const attenuationDb =
      calibrationGoal === "system"
        ? filteredMLSAttenuation.attenuationDbSystem
        : filteredMLSAttenuation.attenuationDbComponent;
    const attenuationDbRounded = Math.round(attenuationDb * 10) / 10;

    let soundBurstDb = calibrateSoundBurstLevelReTBool.current
      ? calibrateSoundBurstDb.current + parameters.T - parameters.gainDBSPL
      : calibrateSoundBurstDb.current;
    soundBurstDb = Math.round(soundBurstDb);
    const amplitudeMLS = Math.pow(10, soundBurstDb / 20).toFixed(1);
    const p = document.createElement("p");
    const downsample = `↓${calibrateSoundBurstDownsample.current}:1`;
    const reportParameters = `MLS: ${soundBurstDb} dB, ampl. ${amplitudeMLS}, 
    ${calibrateSoundBurstSec.current} s, 
    ${calibrateSoundBurstRepeats.current}✕, ${
      calibrateSoundHz.current
    } Hz ${downsample}<br>
    Filtered MLS: ${attenuationDbRounded} dB, ampl. ${amplitude},
     ${calibrateSoundMinHz.current}–${maxHz} Hz, ${attenuatorGain.toFixed(
       1,
     )} dB atten.<br>
    IR: ${calibrateSoundIRSec.current} s, IIR: ${
      calibrateSoundIIRSec.current
    } s,
     ${calibrateSoundMinHz.current} to ${maxHz} Hz`;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    p.style.userSelect = "text";
    tableDiv.appendChild(p);
  }
  plotCanvas.parentNode.appendChild(tableDiv);

  tableDiv.style.position = "absolute";
  const tableRec = tableDiv.getBoundingClientRect();
  const rect = plotCanvas.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.top + tableRec.height - 15) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";
  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
};

export const plotImpulseResponse = async (
  plotCanvas,
  ir,
  title,
  filteredMLSRange,
  isLoudspeakerCalibration,
  RMSError,
) => {
  const IrFreq = ir.Freq;
  const IrGain = ir.Gain;
  const IrPoints = IrFreq.filter((x, i) => x <= 20000).map((x, i) => {
    return { x: x, y: IrGain[i] };
  });
  let maxY = safeMax(...IrPoints.map((point) => point.y));
  let minY = safeMin(...IrPoints.map((point) => point.y));
  const plotCanvasHeight =
    (Math.ceil(maxY / 10) * 10 - Math.floor(minY / 10) * 10 + 60) * 6;

  plotCanvas.height = plotCanvasHeight;
  plotCanvas.width = 600;

  const data = {
    datasets: [
      {
        label: "Impulse response",
        data: IrPoints,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        showLine: true,
      },
    ],
  };
  const config = {
    type: "line",
    data: data,
    options: {
      responsive: false,
      // aspectRatio : 1,
      plugins: {
        title: {
          display: true,
          text: isLoudspeakerCalibration
            ? "Loudspeaker Profile"
            : "Microphone Profile",
          font: {
            size: 22,
            weight: "normal",
            family: "system-ui",
          },
        },
        subtitle: {
          display: false,
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          position: "bottom",
          title: {
            display: true,
            text: "Frequency (Hz)",
            font: {
              size: "19px",
            },
          },
          min: 20,
          max: 20000,
          ticks: {
            callback: function (value, index, values) {
              const tickValues = [
                20, 100, 200, 1000, 2000, 10000, 16000, 20000,
              ];
              return tickValues.includes(value) ? value : "";
            },
            font: {
              size: 15,
            },
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Gain (dB)",
            font: {
              size: "19px",
            },
          },
          min: Math.floor(minY / 10) * 10 - 50,
          max: Math.ceil(maxY / 10) * 10 + 10,
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
          },
        },
      },
    },
  };

  const valueAt1000Hz = findGainatFrequency(
    IrPoints.map((point) => point.x),
    IrPoints.map((point) => point.y),
    1000,
  );

  const plot = new Chart(plotCanvas, config);
  const chartArea = plot.chartArea;
  const table = displaySummarizedTransducerTable(
    loudspeakerInfo.current,
    microphoneInfo.current,
    "",
    isLoudspeakerCalibration,
    "goal",
    "",
    [calibrateSoundHz.current, calibrateSoundHz.current],
    true,
    valueAt1000Hz,
    RMSError,
  );
  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.lineHeight = "1";
  if (showSoundParametersBool.current) {
    const maxHz = fMaxHz.component;
    const attenuatorGain = attenuatorGainDB.component;
    const p = document.createElement("p");
    const maxAbs = filteredMLSAttenuation.maxAbsComponent;
    const amplitude = (Math.round(maxAbs * 10) / 10).toFixed(1);
    const attenuationDb = filteredMLSAttenuation.attenuationDbComponent;
    const attenuationDbRounded = Math.round(attenuationDb * 10) / 10;

    let soundBurstDb = calibrateSoundBurstLevelReTBool.current
      ? calibrateSoundBurstDb.current + parameters.T - parameters.gainDBSPL
      : calibrateSoundBurstDb.current;
    soundBurstDb = Math.round(soundBurstDb);
    const downsample = `↓${calibrateSoundBurstDownsample.current}:1`;
    const amplitudeMLS = Math.pow(10, soundBurstDb / 20).toFixed(3);
    const reportParameters = `MLS: ${soundBurstDb} dB, ampl. ${amplitudeMLS}, 
    ${calibrateSoundBurstSec.current} s,
     ${calibrateSoundBurstRepeats.current}✕, ${
       calibrateSoundHz.current
     } Hz ${downsample},  scalar ${calibrateSoundBurstScalarDB.current} dB<br>
    Filtered MLS: ${attenuationDbRounded} dB, ampl. ${amplitude}, 
    ${calibrateSoundMinHz.current}–${maxHz} Hz, ${attenuatorGain.toFixed(
      1,
    )} dB atten.<br>
    IR: ${calibrateSoundIRSec.current} s, IIR: ${
      calibrateSoundIIRSec.current
    } s, 
    octaves: ${calibrateSoundSmoothOctaves.current}, ${
      calibrateSoundMinHz.current
    }
     to ${maxHz} Hz, SD rec. filt. MLS: ${
       sdOfRecordingOfFilteredMLS.current
     } dB`;

    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    p.style.userSelect = "text";
    tableDiv.appendChild(p);
  }

  await saveSD_GAIN_info(
    isLoudspeakerCalibration ? "Loudspeaker" : "Microphone",
    sdOfRecordingOfFilteredMLS.current,
    RMSError,
    valueAt1000Hz,
  );
  plotCanvas.parentNode.appendChild(tableDiv);

  tableDiv.style.position = "absolute";
  const tableRec = tableDiv.getBoundingClientRect();
  const rect = plotCanvas.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.top + tableRec.height + 44) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";

  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
};

export const PlotsForTestPage = (
  plotCanvas,
  component_iir_psd,
  system_iir_psd,
) => {
  // iir_psd = {x:[],y:[], y_no_bandpass : [], y_no_bandpass_no_window:[]}
  const system_iir_no_bandpass = system_iir_psd.x.map((x, i) => {
    return { x: x, y: 10 * Math.log10(system_iir_psd.y_no_bandpass[i]) };
  });

  const component_iirData_no_bandpass = component_iir_psd.x.map((x, i) => {
    return { x: x, y: 10 * Math.log10(component_iir_psd.y_no_bandpass[i]) };
  });

  const plot = new Chart(plotCanvas, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Loudspeaker + Microphone IIR",
          data: system_iir_no_bandpass,
          borderColor: "red",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderWidth: 2,
        },
        {
          label: "Component IIR",
          data: component_iirData_no_bandpass,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderWidth: 2,
        },
      ],
    },

    options: {
      responsive: false,
      // aspectRatio : 1,
      plugins: {
        title: {
          display: true,
          text: "IIR",
          font: {
            size: 22,
            weight: "normal",
            family: "system-ui",
          },
        },
        // subtitle: {
        //   display: true,
        //   text: subtitleText,
        //   font: {
        //     size: 19,
        //     family: "system-ui",
        //   },
        //   align: "center",
        // },
        legend: {
          labels: {
            font: {
              size: 15,
            },
            usePointStyle: true,
            generateLabels: function (chart) {
              const data = chart.data;
              if (data.datasets.length) {
                return data.datasets.map(function (dataset, i) {
                  return {
                    text: dataset.label,
                    fillStyle: dataset.backgroundColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: dataset.borderWidth,
                    hidden: !chart.isDatasetVisible(i),
                    index: i,
                    lineDash: dataset.borderDash,
                    pointStyle: "line",
                  };
                });
              }
              return [];
            },
          },
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          position: "bottom",
          title: {
            display: true,
            text: "Frequency (Hz)",
            font: {
              size: "19px",
            },
          },
          min: 20,
          max: 20000,
          ticks: {
            callback: function (value, index, values) {
              const tickValues = [
                20, 100, 200, 1000, 2000, 10000, 16000, 20000,
              ];
              return tickValues.includes(value) ? value : "";
            },
            font: {
              size: 15,
            },
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Power spectral density (dB)",
            font: {
              size: "19px",
            },
          },
          min: -100,
          max: 0,
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
          },
        },
      },
    },
  });
};

export const plotRecordings = (
  plotCanvas,
  recordingChecks,
  isLoudspeakerCalibration,
  filteredMLSRange,
  soundCheck,
  warningsDiv,
) => {
  const TData = recordingChecks.unfiltered[0].recT;
  const unfilteredData = TData.map((x, i) => {
    return { x: x, y: recordingChecks.unfiltered[0].recDb[i] };
  });
  const componentData =
    soundCheck === "both" || soundCheck === "goal"
      ? TData.map((x, i) => {
          return {
            x: x,
            y: recordingChecks.component[recordingChecks.component.length - 1]
              .recDb[i],
          };
        })
      : [];
  const systemData =
    soundCheck === "both" || soundCheck === "system"
      ? TData.map((x, i) => {
          return {
            x: x,
            y: recordingChecks.system[recordingChecks.system.length - 1].recDb[
              i
            ],
          };
        })
      : [];
  // Assuming warmupT is the same for all categories

  const postTData = recordingChecks.unfiltered[0].postT;
  const unfilteredPostData = postTData.map((x, i) => {
    return { x: x, y: recordingChecks.unfiltered[0].postDb[i] };
  });
  const componentPostData =
    soundCheck === "both" || soundCheck === "goal"
      ? postTData.map((x, i) => {
          return {
            x: x,
            y: recordingChecks.component[recordingChecks.component.length - 1]
              .postDb[i],
          };
        })
      : [];
  const systemPostData =
    soundCheck === "both" || soundCheck === "system"
      ? postTData.map((x, i) => {
          return {
            x: x,
            y: recordingChecks.system[recordingChecks.system.length - 1].postDb[
              i
            ],
          };
        })
      : [];

  const warmupTData = recordingChecks.unfiltered[0].warmupT;
  const unfilteredWarmupData = warmupTData.map((x, i) => {
    return { x: x, y: recordingChecks.unfiltered[0].warmupDb[i] };
  });
  const componentWarmupData =
    soundCheck === "both" || soundCheck === "goal"
      ? warmupTData.map((x, i) => {
          return {
            x: x,
            y: recordingChecks.component[recordingChecks.component.length - 1]
              .warmupDb[i],
          };
        })
      : [];
  const systemWarmupData =
    soundCheck === "both" || soundCheck === "system"
      ? warmupTData.map((x, i) => {
          return {
            x: x,
            y: recordingChecks.system[recordingChecks.system.length - 1]
              .warmupDb[i],
          };
        })
      : [];
  // Assuming warmupT is the same for all categories

  let maxY = findMaxValue([
    ...unfilteredData.map((point) => point.y),
    ...componentData.map((point) => point.y),
    ...systemData.map((point) => point.y),
    ...unfilteredWarmupData.map((point) => point.y),
    ...componentWarmupData.map((point) => point.y),
    ...systemWarmupData.map((point) => point.y),
    ...unfilteredPostData.map((point) => point.y),
    ...componentPostData.map((point) => point.y),
    ...systemPostData.map((point) => point.y),
  ]);

  let maxX = findMaxValue([
    ...unfilteredData.map((point) => point.x),
    ...componentData.map((point) => point.x),
    ...systemData.map((point) => point.x),
    ...unfilteredWarmupData.map((point) => point.x),
    ...componentWarmupData.map((point) => point.x),
    ...systemWarmupData.map((point) => point.x),
    ...unfilteredPostData.map((point) => point.x),
    ...componentPostData.map((point) => point.x),
    ...systemPostData.map((point) => point.x),
  ]);

  let minY = findMinValue([
    ...unfilteredData.map((point) => point.y),
    ...componentData.map((point) => point.y),
    ...systemData.map((point) => point.y),
    ...unfilteredWarmupData.map((point) => point.y),
    ...componentWarmupData.map((point) => point.y),
    ...systemWarmupData.map((point) => point.y),
    ...unfilteredPostData.map((point) => point.y),
    ...componentPostData.map((point) => point.y),
    ...systemPostData.map((point) => point.y),
  ]);

  minY = Math.floor(minY / 10) * 10 - 60;
  maxY = Math.ceil(maxY / 10) * 10 + 10;

  const plotCanvasHeight =
    (Math.ceil(maxY / 10) * 10 - Math.floor(minY / 10) * 10) * 6;

  plotCanvas.height = plotCanvasHeight;
  plotCanvas.width = 600;

  let transducer = isLoudspeakerCalibration ? "Loudspeaker" : "Microphone";
  const datasets = [
    {
      label: "pre",
      data: unfilteredWarmupData,
      borderColor: "red",
      backgroundColor: "rgba(0, 0, 0, 0)",
      pointRadius: 0,
      showLine: true,
      borderDash: [2, 3], // Dashed line for unfiltered warm-up data
      borderWidth: 2,
    },
    {
      label: "MLS SD=" + recordingChecks.unfiltered[0].sd + " dB",
      data: unfilteredData,
      borderColor: "red",
      backgroundColor: "rgba(0, 0, 0, 0)",
      pointRadius: 0,
      showLine: true,
      borderWidth: 2,
    },
    {
      label: "post",
      data: unfilteredPostData,
      borderColor: "red",
      backgroundColor: "rgba(0, 0, 0, 0)",
      pointRadius: 0,
      showLine: true,
      borderDash: [2, 3], // Dashed line for unfiltered warm-up data
      borderWidth: 2,
    },
  ];
  if (soundCheck === "goal") {
    datasets.push(
      {
        label: "pre",
        data: componentWarmupData,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
      {
        label:
          "MLS corrected for " +
          transducer +
          " SD=" +
          recordingChecks.component[recordingChecks.component.length - 1].sd +
          " dB",
        data: componentData,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderWidth: 2,
        fill: false,
      },
      {
        label: "post",
        data: componentPostData,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
    );
  } else if (soundCheck === "system") {
    datasets.push(
      {
        label: "pre",
        data: systemWarmupData,
        borderColor: "green",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
      {
        label:
          "MLS corrected for Loudspeaker+Microphone SD=" +
          recordingChecks.system[recordingChecks.system.length - 1].sd +
          " dB",
        data: systemData,
        borderColor: "green",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderWidth: 2,
        fill: false,
      },
      {
        label: "post",
        data: systemPostData,
        borderColor: "green",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
    );
  } else if (soundCheck === "both") {
    datasets.push(
      {
        label: "pre",
        data: componentWarmupData,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
      {
        label:
          "MLS corrected for " +
          transducer +
          " SD=" +
          recordingChecks.component[recordingChecks.component.length - 1].sd +
          " dB",
        data: componentData,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderWidth: 2,
        fill: false,
      },
      {
        label: "post",
        data: componentPostData,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
      {
        label: "pre",
        data: systemWarmupData,
        borderColor: "green",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
      {
        label:
          "MLS corrected for Loudspeaker+Microphone SD=" +
          recordingChecks.system[recordingChecks.system.length - 1].sd +
          " dB",
        data: systemData,
        borderColor: "green",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderWidth: 2,
        fill: false,
      },
      {
        label: "post",
        data: systemPostData,
        borderColor: "green",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointRadius: 0,
        showLine: true,
        borderDash: [2, 3],
        borderWidth: 2,
      },
    );
  }
  console.log(datasets);

  // Chart.js configuration for warm-up plot
  const warmupChart = new Chart(plotCanvas, {
    type: "line",
    data: {
      // Combine warm-up and recording labels
      datasets: datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Power Variation in Wideband Recordings",
          font: {
            size: 22,
            weight: "normal",
            family: "system-ui",
          },
        },
        subtitle: {
          display: false,
        },
        legend: {
          labels: {
            font: {
              size: 15,
            },
            usePointStyle: true,
            pointStyle: "line",
            generateLabels: function (chart) {
              const data = chart.data;

              if (data.datasets.length) {
                return data.datasets.reduce((labels, dataset, i) => {
                  // Exclude labels containing "pre" or "post"
                  if (dataset.label !== "pre" && dataset.label !== "post") {
                    labels.push({
                      text: dataset.label,
                      fillStyle: dataset.backgroundColor,
                      strokeStyle: dataset.borderColor,
                      lineWidth: dataset.borderWidth,
                      hidden: !chart.isDatasetVisible(i),
                      index: i,
                      lineDash: dataset.borderDash,
                      pointStyle: "line",
                    });
                  }
                  return labels;
                }, []);
              }

              return [];
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          min: 0,
          max: maxX, //Math.ceil(maxX / 0.5) * 0.5,
          title: {
            display: true,
            text: "Time (s)",
            font: {
              size: "19px",
            },
          },
          ticks: {
            stepSize: 0.5,
            font: {
              size: 15,
            },
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Power (dB)",
            font: {
              size: "19px",
            },
          },
          min: minY,
          max: maxY,
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
          },
        },
      },
    },
  });

  const chartArea = warmupChart.chartArea;
  const table = displaySummarizedTransducerTable(
    loudspeakerInfo.current,
    microphoneInfo.current,
    "",
    isLoudspeakerCalibration,
    "goal",
    "",
    [calibrateSoundHz.current, calibrateSoundHz.current],
  );
  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.lineHeight = "1";
  if (showSoundParametersBool.current) {
    const Min = Math.round(filteredMLSRange.Min * 10) / 10;
    const Max = Math.round(filteredMLSRange.Max * 10) / 10;
    const p = document.createElement("p");
    const downsample = `↓${calibrateSoundBurstDownsample.current}:1`;
    const speakPlusMicSD = qualityMetrics.current?.system
      ? `Speak+mic corr. ${qualityMetrics.current?.system},`
      : "";
    const reportParameters = `MLS burst: ${calibrateSoundBurstDb.current} dB, ${
      calibrateSoundBurstSec.current
    } s, ${calibrateSoundBurstRepeats.current}✕, ${
      calibrateSoundHz.current
    } Hz ${downsample}<br>IR: ${calibrateSoundIRSec.current} s, IIR: ${
      calibrateSoundIIRSec.current
    } s, 
    octaves: ${calibrateSoundSmoothOctaves.current}, ${
      calibrateSoundMinHz.current
    }
     to ${calibrateSoundMaxHz.current} Hz<br>Filtered MLS Range: ${Min.toFixed(
       3,
     )} to ${Max.toFixed(3)}<br>
    SD (dB): Rec. MLS ${qualityMetrics.current.mls},
     ${speakPlusMicSD}
     ${isLoudspeakerCalibration ? "Speak" : "Mic"} corr. ${
       qualityMetrics.current?.component
     }`;

    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    p.style.userSelect = "text";
    tableDiv.appendChild(p);
  }
  plotCanvas.parentNode.appendChild(tableDiv);

  tableDiv.style.position = "absolute";
  const tableRec = tableDiv.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.top + tableRec.height) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";
  warningsDiv.style.marginLeft = chartArea.left + 3 + "px";
  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
};

export const plotVolumeRecordings = (
  plotCanvas,
  recordingChecks,
  isLoudspeakerCalibration,
  filteredMLSRange,
  warningsDiv,
) => {
  const volumeData = recordingChecks["volume"];
  const volumeLabels = Object.keys(volumeData);
  let color = [
    "#3366CC",
    "#DC3912",
    "#FF9900",
    "#109618",
    "#990099",
    "#0099C6",
    "#DD4477",
    "#66AA00",
    "#B82E2E",
    "#316395",
    "#994499",
    "#22AA99",
    "#AAAA11",
    "#6633CC",
    "#E67300",
    "#8B0707",
    "#329262",
    "#5574A6",
    "#651067",
  ];
  const volumeDatasets = volumeLabels.map((inDB, i) => {
    let volumeRecordings = volumeData[inDB];

    let volumeRecordingData = volumeRecordings.recT.map((x, j) => {
      return { x: x, y: volumeRecordings.recDb[j] };
    });

    return {
      label: `${inDB} dB SD=` + volumeRecordings.sd + " dB",
      data: volumeRecordingData,
      borderColor: color[i % color.length],
      backgroundColor: "rgba(0, 0, 0, 0)",
      pointRadius: 0,
      showLine: true,
      borderWidth: 2,
    };
  });

  const volumeWarmupDatasets = volumeLabels.map((inDB, i) => {
    let volumeWarmup = volumeData[inDB];

    let volumeWarmupData = volumeWarmup.preT.map((x, j) => {
      return { x: x, y: volumeWarmup.preDb[j] };
    });

    return {
      label: "pre",
      data: volumeWarmupData,
      borderColor: color[i % color.length],
      backgroundColor: "rgba(0, 0, 0, 0)",
      pointRadius: 0,
      showLine: true,
      borderDash: [2, 3],
      borderWidth: 2,
    };
  });

  const volumePostDatasets = volumeLabels.map((inDB, i) => {
    let volumePostRecordings = volumeData[inDB];

    let volumePostData = volumePostRecordings.postT.map((x, j) => {
      return { x: x, y: volumePostRecordings.postDb[j] };
    });

    return {
      label: "post",
      data: volumePostData,
      borderColor: color[i % color.length],
      backgroundColor: "rgba(0, 0, 0, 0)",
      pointRadius: 0,
      showLine: true,
      borderDash: [2, 3],
      borderWidth: 2,
    };
  });

  const allDatasets = [
    ...volumeDatasets,
    ...volumeWarmupDatasets,
    ...volumePostDatasets,
  ];

  // Calculate maxY and minY for the new datasets
  let maxY = safeMax(
    ...volumeDatasets.map((dataset) =>
      safeMax(...dataset.data.map((point) => point.y)),
    ),
    ...volumeWarmupDatasets.map((dataset) =>
      safeMax(...dataset.data.map((point) => point.y)),
    ),
    ...volumePostDatasets.map((dataset) =>
      safeMax(...dataset.data.map((point) => point.y)),
    ),
  );

  let maxX = safeMax(
    ...volumeDatasets.map((dataset) =>
      safeMax(...dataset.data.map((point) => point.x)),
    ),
    ...volumeWarmupDatasets.map((dataset) =>
      safeMax(...dataset.data.map((point) => point.x)),
    ),
    ...volumePostDatasets.map((dataset) =>
      safeMax(...dataset.data.map((point) => point.x)),
    ),
  );

  let minY = safeMin(
    ...volumeDatasets.map((dataset) =>
      safeMin(...dataset.data.map((point) => point.y)),
    ),
    ...volumeWarmupDatasets.map((dataset) =>
      safeMin(...dataset.data.map((point) => point.y)),
    ),
    ...volumePostDatasets.map((dataset) =>
      safeMin(...dataset.data.map((point) => point.y)),
    ),
  );

  maxY = Math.ceil(maxY / 10) * 10 + 10;
  minY = Math.floor(minY / 10) * 10 - 60;
  const plotCanvasHeight = (maxY - minY) * 6 + 80;

  plotCanvas.height = plotCanvasHeight;
  plotCanvas.width = 600;

  // Chart.js configuration for warm-up plot
  const volumeChart = new Chart(plotCanvas, {
    type: "line",
    data: {
      // Combine warm-up and recording labels
      datasets: allDatasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Power Variation in 1000 Hz Recordings",
          font: {
            size: 22,
            weight: "normal",
            family: "system-ui",
          },
        },
        subtitle: {
          display: false,
        },
        legend: {
          labels: {
            font: {
              size: 15,
            },
            usePointStyle: true,
            pointStyle: "line",
            generateLabels: function (chart) {
              const data = chart.data;

              if (data.datasets.length) {
                return data.datasets.reduce((labels, dataset, i) => {
                  // Exclude labels containing "pre" or "post"
                  if (dataset.label !== "pre" && dataset.label !== "post") {
                    labels.push({
                      text: dataset.label,
                      fillStyle: dataset.backgroundColor,
                      strokeStyle: dataset.borderColor,
                      lineWidth: dataset.borderWidth,
                      hidden: !chart.isDatasetVisible(i),
                      index: i,
                      lineDash: dataset.borderDash,
                      pointStyle: "line",
                    });
                  }
                  return labels;
                }, []);
              }

              return [];
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          min: 0,
          max: maxX, //Math.ceil(maxX / 0.5) * 0.5,
          title: {
            display: true,
            text: "Time (s)",
            font: {
              size: "19px",
            },
          },
          ticks: {
            stepSize: 0.5,
            font: {
              size: 15,
            },
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Power (dB)",
            font: {
              size: "19px",
            },
          },
          min: minY,
          max: maxY,
          ticks: {
            stepSize: 10,
            font: {
              size: 15,
            },
          },
        },
      },
    },
  });

  const chartArea = volumeChart.chartArea;
  const table = displaySummarizedTransducerTable(
    loudspeakerInfo.current,
    microphoneInfo.current,
    "",
    isLoudspeakerCalibration,
    "system",
    "",
    [calibrateSoundHz.current, calibrateSoundHz.current],
  );
  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.lineHeight = "1";
  if (showSoundParametersBool.current) {
    const p = document.createElement("p");
    const reportParameters = `1000 Hz duration: pre ${calibrateSound1000HzPreSec.current} s, use ${calibrateSound1000HzSec.current} s, post ${calibrateSound1000HzPostSec.current} s`;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    p.style.userSelect = "text";
    tableDiv.appendChild(p);
  }
  tableDiv.style.zIndex = 1;
  plotCanvas.parentNode.appendChild(tableDiv);

  tableDiv.style.position = "absolute";
  const tableRec = tableDiv.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.top + tableRec.height - 48) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";
  warningsDiv.style.marginLeft = chartArea.left + 3 + "px";
};

export const standardDeviation = (values) => {
  const avg = average(values);

  const squareDiffs = values.map((value) => {
    const diff = value - avg;
    const sqrDiff = diff * diff;
    return sqrDiff;
  });

  const avgSquareDiff = average(squareDiffs);

  const stdDev = Math.sqrt(avgSquareDiff);
  // only 1 digit after the decimal place
  const std = Math.round(stdDev * 10) / 10;
  return std.toFixed(1);
};

const average = (data) => {
  const sum = data.reduce((sum, value) => {
    return sum + value;
  }, 0);

  const avg = sum / data.length;
  return avg;
};

const interpolateGain = (microphoneData, mlsData) => {
  // Assuming microphoneData and mlsData are arrays of objects with x and y properties
  const result = [];

  for (let i = 0; i < mlsData.length; i++) {
    const mlsFreq = mlsData[i].x;

    // Find the two closest points in the microphoneData for linear interpolation
    let lowerIndex = 0;
    let upperIndex = 0;

    for (let j = 0; j < microphoneData.length; j++) {
      if (microphoneData[j].x <= mlsFreq) {
        lowerIndex = j;
      }

      if (microphoneData[j].x >= mlsFreq) {
        upperIndex = j;
        break;
      }
    }

    // Perform linear interpolation
    const x0 = microphoneData[lowerIndex].x;
    const x1 = microphoneData[upperIndex].x;
    const y0 = microphoneData[lowerIndex].y;
    const y1 = microphoneData[upperIndex].y;

    const interpolatedGain = y0 + (y1 - y0) * ((mlsFreq - x0) / (x1 - x0));

    // Subtract the interpolated gain from the MLS gain
    const subtractedGain = mlsData[i].y - interpolatedGain;

    // Store the result
    result.push({
      x: mlsFreq,
      y: subtractedGain,
    });
  }

  return result;
};
