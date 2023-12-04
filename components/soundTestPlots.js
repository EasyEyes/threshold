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
  calibrateSoundBurstsWarmup,
  calibrateSoundHz,
  calibrateSoundIRSec,
  calibrateSoundIIRSec,
  calibrateSoundMaxHz,
  calibrateSoundMinHz,
  calibrateSoundSmoothOctaves,
  loudspeakerInfo,
  microphoneInfo,
  qualityMetrics,
  showSoundParametersBool,
  filteredMLSAttenuation,
} from "./global";
import {
  findGainatFrequency,
  findMinValue,
  findMaxValue,
} from "./soundCalibrationHelpers";

export const plotSoundLevels1000Hz = (
  plotCanvas,
  parameters,
  soundLevels,
  outDBSPL1000Values,
  title,
  calibrationGoal,
  isLoudspeakerCalibration,
  position = "left"
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
  const modelWithOutBackground = [];
  const minM = Math.min(...soundLevels);
  const maxM = Math.max(...soundLevels);
  const minY = Math.min(...outDBSPL1000Values);
  const maxY = Math.max(...outDBSPL1000Values);
  const ratio = plotCanvas.height / plotCanvas.width;
  // use ratio to adjust plotCanvas height and width

  for (let i = minM; i <= maxM; i += 0.1) {
    model.push({
      x: i,
      y: SoundLevelModel(
        Number(i),
        parameters.backgroundDBSPL,
        parameters.gainDBSPL,
        parameters.T,
        parameters.W,
        parameters.R
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
        parameters.R
      ),
    });
  }
  // sort the data points by x
  model.sort((a, b) => a.x - b.x);

  // sort the data points by x
  modelWithOutBackground.sort((a, b) => a.x - b.x);

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
        borderDash: [5, 5],
        tension: 0.1,
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
            text: `in (${inDBUnits})`,
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
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: `out (${outDBUnits})`,
            font: {
              size: "19px",
            },
          },
          ticks: {
            stepSize: 10 * ratio,
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
    ""
  );

  // add the table to the lower right of the canvas. Adjust the position of the table based on the canvas size
  const chartArea = plot.chartArea;
  const tableDiv = document.createElement("div");
  tableDiv.style.position = "absolute";
  tableDiv.appendChild(table);
  if (showSoundParametersBool.current) {
    const p = document.createElement("p");
    const reportParameters = `1000 Hz duration: pre ${calibrateSound1000HzPreSec.current} s, use ${calibrateSound1000HzSec.current} s, post ${calibrateSound1000HzPostSec.current}  `;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
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
  filteredMLSRange
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

  const backgroundMergedDataPoints = backgroundNoise.x_background
    ? backgroundNoise.x_background
        .filter((x) => x <= 20000)
        .map((x, i) => {
          return { x: x, y: 10 * Math.log10(backgroundNoise.y_background[i]) };
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
          convMergedDataPoints[i].x
        );
    });

    unconvMergedDataPoints.forEach((point, i) => {
      unconvMergedDataPoints[i].y =
        unconvMergedDataPoints[i].y -
        findGainatFrequency(
          microphoneGainFreq,
          microphoneGainGain,
          unconvMergedDataPoints[i].x
        );
    });

    backgroundMergedDataPoints.forEach((point, i) => {
      backgroundMergedDataPoints[i].y =
        backgroundMergedDataPoints[i].y -
        findGainatFrequency(
          microphoneGainFreq,
          microphoneGainGain,
          backgroundMergedDataPoints[i].x
        );
    });

    // console.log(microphoneGainPoints, convMergedDataPoints, unconvMergedDataPoints, backgroundMergedDataPoints);
  }

  // expected correction is the sum of the recording of MLS and the filtered MLS
  const expectedCorrectionPoints = [];
  if (filteredDigitalMLSPoints.length > 0) {
    for (let i = 0; i < filteredDigitalMLSPoints.length; i++) {
      expectedCorrectionPoints.push({
        x: filteredDigitalMLSPoints[i].x,
        y: filteredDigitalMLSPoints[i].y + unconvMergedDataPoints[i].y,
      });
    }
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
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderColor: "rgba(0, 0, 0, 1)",
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
      borderDash: [5, 5],
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
      borderDash: [5, 5],
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
      borderDash: [5, 5],
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
    maxY = Math.max(
      ...unconvMergedDataPoints.map((point) => point.y),
      ...convMergedDataPoints.map((point) => point.y),
      ...backgroundMergedDataPoints.map((point) => point.y),
      ...digitalMLSPoints.map((point) => point.y),
      ...filteredDigitalMLSPoints.map((point) => point.y),
      ...microphoneGainPoints.map((point) => point.y),
      ...expectedCorrectionPoints.map((point) => point.y)
    );
  } else {
    maxY = Math.max(
      ...unconvMergedDataPoints.map((point) => point.y),
      ...convMergedDataPoints.map((point) => point.y),
      ...backgroundMergedDataPoints.map((point) => point.y),
      ...digitalMLSPoints.map((point) => point.y),
      ...filteredDigitalMLSPoints.map((point) => point.y),
      ...expectedCorrectionPoints.map((point) => point.y)
    );
  }

  let minY;
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
      1000
    );
    const gainAt1000Hz_conv = findGainatFrequency(
      convMergedDataPoints.map((point) => point.x),
      convMergedDataPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_background = findGainatFrequency(
      backgroundMergedDataPoints.map((point) => point.x),
      backgroundMergedDataPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_digitalMLS = findGainatFrequency(
      digitalMLSPoints.map((point) => point.x),
      digitalMLSPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_filteredDigitalMLS = findGainatFrequency(
      filteredDigitalMLSPoints.map((point) => point.x),
      filteredDigitalMLSPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_microphoneGain = findGainatFrequency(
      microphoneGainPoints.map((point) => point.x),
      microphoneGainPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_expectedCorrection = findGainatFrequency(
      expectedCorrectionPoints.map((point) => point.x),
      expectedCorrectionPoints.map((point) => point.y),
      1000
    );
    minYAt1000Hz = Math.min(
      gainAt1000Hz_unconv,
      gainAt1000Hz_conv,
      gainAt1000Hz_background,
      gainAt1000Hz_digitalMLS,
      gainAt1000Hz_filteredDigitalMLS,
      gainAt1000Hz_microphoneGain,
      gainAt1000Hz_expectedCorrection
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
      1000
    );
    const gainAt1000Hz_conv = findGainatFrequency(
      convMergedDataPoints.map((point) => point.x),
      convMergedDataPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_background = findGainatFrequency(
      backgroundMergedDataPoints.map((point) => point.x),
      backgroundMergedDataPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_digitalMLS = findGainatFrequency(
      digitalMLSPoints.map((point) => point.x),
      digitalMLSPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_filteredDigitalMLS = findGainatFrequency(
      filteredDigitalMLSPoints.map((point) => point.x),
      filteredDigitalMLSPoints.map((point) => point.y),
      1000
    );
    const gainAt1000Hz_expectedCorrection = findGainatFrequency(
      expectedCorrectionPoints.map((point) => point.x),
      expectedCorrectionPoints.map((point) => point.y),
      1000
    );
    minYAt1000Hz = Math.min(
      gainAt1000Hz_unconv,
      gainAt1000Hz_conv,
      gainAt1000Hz_background,
      gainAt1000Hz_digitalMLS,
      gainAt1000Hz_filteredDigitalMLS,
      gainAt1000Hz_expectedCorrection
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
    [calibrateSoundHz.current, calibrateSoundHz.current]
  );

  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.style.lineHeight = "1";
  if (showSoundParametersBool.current) {
    const filteredDataPoints = convMergedDataPoints.filter(
      (point) =>
        point.x >= calibrateSoundMinHz.current &&
        point.x <= calibrateSoundMaxHz.current
    );
    const filteredDataPointsY = filteredDataPoints.map((point) => point.y);
    const sd = standardDeviation(filteredDataPointsY);

    const filteredExpectedCorrectionPoints = expectedCorrectionPoints.filter(
      (point) =>
        point.x >= calibrateSoundMinHz.current &&
        point.x <= calibrateSoundMaxHz.current
    );
    const filteredExpectedCorrectionPointsY =
      filteredExpectedCorrectionPoints.map((point) => point.y);
    const sdExpectedCorrection = standardDeviation(
      filteredExpectedCorrectionPointsY
    );

    const p = document.createElement("p");
    const reportParameters = `SD: predicted ${sdExpectedCorrection} dB and actual ${sd} dB over ${calibrateSoundMinHz.current} to ${calibrateSoundMaxHz.current} Hz`;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    tableDiv.appendChild(p);
  }
  tableDiv.appendChild(table);
  if (showSoundParametersBool.current) {
    const maxAbs =
      calibrationGoal === "system"
        ? filteredMLSAttenuation.maxAbsSystem
        : filteredMLSAttenuation.maxAbsComponent;
    const gain =
      calibrationGoal === "system"
        ? filteredMLSAttenuation.system
        : filteredMLSAttenuation.component;
    const amplitude = Math.round(gain * maxAbs * 10) / 10;
    const attenuationDb =
      calibrationGoal === "system"
        ? filteredMLSAttenuation.attenuationDbSystem
        : filteredMLSAttenuation.attenuationDbComponent;
    const attenuationDbRounded = Math.round(attenuationDb * 10) / 10;
    const Min = Math.round(filteredMLSRange.Min * 10) / 10;
    const Max = Math.round(filteredMLSRange.Max * 10) / 10;

    const p = document.createElement("p");
    const reportParameters = `MLS burst: ${calibrateSoundBurstDb.current} dB, ${
      calibrateSoundBurstSec.current
    } s, ${calibrateSoundBurstRepeats.current}✕, ${
      calibrateSoundHz.current
    } Hz <br>IR: ${calibrateSoundIRSec.current} s, IIR: ${
      calibrateSoundIIRSec.current
    } s, ${calibrateSoundMinHz.current} to ${
      calibrateSoundMaxHz.current
    } Hz<br>${attenuationDbRounded} dB attenuation of filtered MLS for amplitude ${amplitude}<br>
    SD (dB): Rec. MLS ${qualityMetrics.current.mls},
     Speak+mic corr. ${qualityMetrics.current?.system},
      ${isLoudspeakerCalibration ? "Speak" : "Mic"} corr. ${
      qualityMetrics.current?.component
    }`;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
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

export const plotImpulseResponse = (
  plotCanvas,
  ir,
  title,
  filteredMLSRange,
  isLoudspeakerCalibration
) => {
  const IrFreq = ir.Freq;
  const IrGain = ir.Gain;
  const IrPoints = IrFreq.filter((x, i) => x <= 20000).map((x, i) => {
    return { x: x, y: IrGain[i] };
  });
  let maxY = Math.max(...IrPoints.map((point) => point.y));
  let minY = Math.min(...IrPoints.map((point) => point.y));
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
        // legend: {
        //   labels: {
        //     font: {
        //       size: 15,
        //     },
        //     usePointStyle: true,
        //     generateLabels: function (chart) {
        //       const data = chart.data;
        //       if (data.datasets.length) {
        //         return data.datasets.map(function (dataset, i) {
        //           return {
        //             text: dataset.label,
        //             fillStyle: dataset.backgroundColor,
        //             strokeStyle: dataset.borderColor,
        //             lineWidth: dataset.borderWidth,
        //             hidden: !chart.isDatasetVisible(i),
        //             index: i,
        //             lineDash: dataset.borderDash,
        //             pointStyle: "line",
        //           };
        //         });
        //       }
        //       return [];
        //     },
        //   },
        // },
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

  const plot = new Chart(plotCanvas, config);
  const chartArea = plot.chartArea;
  const table = displaySummarizedTransducerTable(
    loudspeakerInfo.current,
    microphoneInfo.current,
    "",
    isLoudspeakerCalibration,
    "goal",
    "",
    [calibrateSoundHz.current, calibrateSoundHz.current]
  );
  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.lineHeight = "1";
  if (showSoundParametersBool.current) {
    const Min = Math.round(filteredMLSRange.Min * 10) / 10;
    const Max = Math.round(filteredMLSRange.Max * 10) / 10;
    const p = document.createElement("p");
    const reportParameters = `MLS burst: ${calibrateSoundBurstDb.current} dB, ${
      calibrateSoundBurstSec.current
    } s, ${calibrateSoundBurstRepeats.current}✕, ${
      calibrateSoundHz.current
    } Hz <br>IR: ${calibrateSoundIRSec.current} s, IIR: ${
      calibrateSoundIIRSec.current
    } s, 
    octaves: ${calibrateSoundSmoothOctaves.current}, ${
      calibrateSoundMinHz.current
    }
     to ${calibrateSoundMaxHz.current} Hz<br>Filtered MLS Range: ${Min.toFixed(
      1
    )} to ${Max.toFixed(1)}<br>
    SD (dB): Rec. MLS ${qualityMetrics.current?.mls},
     Speak+mic corr. ${qualityMetrics.current?.system},
     ${isLoudspeakerCalibration ? "Speak" : "Mic"} corr. ${
      qualityMetrics.current?.component
    }`;

    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    tableDiv.appendChild(p);
  }
  plotCanvas.parentNode.appendChild(tableDiv);

  tableDiv.style.position = "absolute";
  const tableRec = tableDiv.getBoundingClientRect();
  const rect = plotCanvas.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.top + tableRec.height + 44) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";

  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
};

export const PlotsForTestPage = (plotCanvas, iir_psd) => {
  // iir_psd = {x:[],y:[], y_no_bandpass : [], y_no_bandpass_no_window:[]}
  const iirData = iir_psd.x.map((x, i) => {
    return { x: x, y: 10 * Math.log10(iir_psd.y[i]) };
  });

  const iirData_no_bandpass = iir_psd.x.map((x, i) => {
    return { x: x, y: 10 * Math.log10(iir_psd.y_no_bandpass[i]) };
  });

  const plot = new Chart(plotCanvas, {
    type: "line",
    data: {
      datasets: [
        {
          label: "IIR",
          data: iirData,
          borderColor: "red",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderWidth: 2,
        },
        {
          label: "IIR no bandpass",
          data: iirData_no_bandpass,
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
  filteredMLSRange
) => {
  const TData = recordingChecks.unfiltered[0].recT;
  const unfilteredData = TData.map((x, i) => {
    return { x: x, y: recordingChecks.unfiltered[0].recDb[i] };
  });
  const componentData = TData.map((x, i) => {
    return {
      x: x,
      y: recordingChecks.component[recordingChecks.component.length - 1].recDb[
        i
      ],
    };
  });
  const systemData = TData.map((x, i) => {
    return {
      x: x,
      y: recordingChecks.system[recordingChecks.system.length - 1].recDb[i],
    };
  });
  // Assuming warmupT is the same for all categories

  const postTData = recordingChecks.unfiltered[0].postT;
  const unfilteredPostData = postTData.map((x, i) => {
    return { x: x, y: recordingChecks.unfiltered[0].postDb[i] };
  });
  const componentPostData = postTData.map((x, i) => {
    return {
      x: x,
      y: recordingChecks.component[recordingChecks.component.length - 1].postDb[
        i
      ],
    };
  });
  const systemPostData = postTData.map((x, i) => {
    return {
      x: x,
      y: recordingChecks.system[recordingChecks.system.length - 1].postDb[i],
    };
  });

  const warmupTData = recordingChecks.unfiltered[0].warmupT;
  const unfilteredWarmupData = warmupTData.map((x, i) => {
    return { x: x, y: recordingChecks.unfiltered[0].warmupDb[i] };
  });
  const componentWarmupData = warmupTData.map((x, i) => {
    return {
      x: x,
      y: recordingChecks.component[recordingChecks.component.length - 1]
        .warmupDb[i],
    };
  });
  const systemWarmupData = warmupTData.map((x, i) => {
    return {
      x: x,
      y: recordingChecks.system[recordingChecks.system.length - 1].warmupDb[i],
    };
  });
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

  console.log("x", maxX, "y", minY, maxY);

  minY = Math.floor(minY / 10) * 10 - 30;
  maxY = Math.ceil(maxY / 10) * 10;

  plotCanvas.height = 600;
  plotCanvas.width = 600;

  let transducer = isLoudspeakerCalibration ? "Loudspeaker" : "Microphone";
  // Chart.js configuration for warm-up plot
  const warmupChart = new Chart(plotCanvas, {
    type: "line",
    data: {
      // Combine warm-up and recording labels
      datasets: [
        {
          label: "pre",
          data: unfilteredWarmupData,
          borderColor: "red",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderDash: [5, 5], // Dashed line for unfiltered warm-up data
          borderWidth: 2,
        },
        {
          label: "pre",
          data: componentWarmupData,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderDash: [5, 5],
          borderWidth: 2,
        },
        {
          label: "pre",
          data: systemWarmupData,
          borderColor: "green",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderDash: [5, 5],
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
          data: unfilteredPostData,
          borderColor: "red",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderDash: [5, 5], // Dashed line for unfiltered warm-up data
          borderWidth: 2,
        },
        {
          label: "post",
          data: componentPostData,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderDash: [5, 5],
          borderWidth: 2,
        },
        {
          label: "post",
          data: systemPostData,
          borderColor: "green",
          backgroundColor: "rgba(0, 0, 0, 0)",
          pointRadius: 0,
          showLine: true,
          borderDash: [5, 5],
          borderWidth: 2,
        },
      ],
    },
    options: {
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
          max: Math.ceil(maxX / 0.5) * 0.5,
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
    [calibrateSoundHz.current, calibrateSoundHz.current]
  );
  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.lineHeight = "1";
  if (showSoundParametersBool.current) {
    const Min = Math.round(filteredMLSRange.Min * 10) / 10;
    const Max = Math.round(filteredMLSRange.Max * 10) / 10;
    const p = document.createElement("p");
    const reportParameters = `MLS burst: ${calibrateSoundBurstDb.current} dB, ${
      calibrateSoundBurstSec.current
    } s, ${calibrateSoundBurstRepeats.current}✕, ${
      calibrateSoundHz.current
    } Hz <br>IR: ${calibrateSoundIRSec.current} s, IIR: ${
      calibrateSoundIIRSec.current
    } s, 
    octaves: ${calibrateSoundSmoothOctaves.current}, ${
      calibrateSoundMinHz.current
    }
     to ${calibrateSoundMaxHz.current} Hz<br>Filtered MLS Range: ${Min.toFixed(
      1
    )} to ${Max.toFixed(1)}<br>
    SD (dB): Rec. MLS ${qualityMetrics.current.mls},
     Speak+mic corr. ${qualityMetrics.current?.system},
     ${isLoudspeakerCalibration ? "Speak" : "Mic"} corr. ${
      qualityMetrics.current?.component
    }`;

    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    tableDiv.appendChild(p);
  }
  plotCanvas.parentNode.appendChild(tableDiv);

  tableDiv.style.position = "absolute";
  const tableRec = tableDiv.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.top + tableRec.height - 42) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";

  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
};

export const plotVolumeRecordings = (
  plotCanvas,
  recordingChecks,
  isLoudspeakerCalibration,
  filteredMLSRange
) => {
  const volumeData = recordingChecks["volume"];
  const volumeLabels = Object.keys(volumeData);
  const color = [
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange",
    "pink",
    "brown",
    "black",
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
      borderDash: [5, 5],
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
      borderDash: [5, 5],
      borderWidth: 2,
    };
  });

  const allDatasets = [
    ...volumeDatasets,
    ...volumeWarmupDatasets,
    ...volumePostDatasets,
  ];

  // Calculate maxY and minY for the new datasets
  let maxY = Math.max(
    ...volumeDatasets.map((dataset) =>
      Math.max(...dataset.data.map((point) => point.y))
    ),
    ...volumeWarmupDatasets.map((dataset) =>
      Math.max(...dataset.data.map((point) => point.y))
    ),
    ...volumePostDatasets.map((dataset) =>
      Math.max(...dataset.data.map((point) => point.y))
    )
  );

  let maxX = Math.max(
    ...volumeDatasets.map((dataset) =>
      Math.max(...dataset.data.map((point) => point.x))
    ),
    ...volumeWarmupDatasets.map((dataset) =>
      Math.max(...dataset.data.map((point) => point.x))
    ),
    ...volumePostDatasets.map((dataset) =>
      Math.max(...dataset.data.map((point) => point.x))
    )
  );

  let minY = Math.min(
    ...volumeDatasets.map((dataset) =>
      Math.min(...dataset.data.map((point) => point.y))
    ),
    ...volumeWarmupDatasets.map((dataset) =>
      Math.min(...dataset.data.map((point) => point.y))
    ),
    ...volumePostDatasets.map((dataset) =>
      Math.min(...dataset.data.map((point) => point.y))
    )
  );

  plotCanvas.height = 600;
  plotCanvas.width = 600;

  // Chart.js configuration for warm-up plot
  const volumeChart = new Chart(plotCanvas, {
    type: "line",
    data: {
      // Combine warm-up and recording labels
      datasets: allDatasets,
    },
    options: {
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
          max: Math.ceil(maxX / 0.5) * 0.5,
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
          min: Math.floor(minY / 10) * 10 - 30,
          max: Math.ceil(maxY / 10) * 10,
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
    [calibrateSoundHz.current, calibrateSoundHz.current]
  );
  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.lineHeight = "1";
  if (showSoundParametersBool.current) {
    const p = document.createElement("p");
    const reportParameters = `1000 Hz duration: pre ${calibrateSound1000HzPreSec.current} s, use ${calibrateSound1000HzSec.current} s, post ${calibrateSound1000HzPostSec.current}  `;
    p.innerHTML = reportParameters;
    p.style.fontSize = "15px";
    p.style.marginBottom = "0px";
    tableDiv.appendChild(p);
  }
  tableDiv.style.zIndex = 1;
  plotCanvas.parentNode.appendChild(tableDiv);

  tableDiv.style.position = "absolute";
  const tableRec = tableDiv.getBoundingClientRect();
  tableDiv.style.marginTop = -(chartArea.bottom - tableRec.height - 147) + "px";
  tableDiv.style.marginLeft = chartArea.left + 3 + "px";
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
