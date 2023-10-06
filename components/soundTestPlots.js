import { Chart } from "chart.js/auto";
import { SoundLevelModel, displaySummarizedTransducerTable } from "./soundTest";
import {
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundHz,
  loudspeakerInfo,
  microphoneInfo,
} from "./global";

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
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
      },
      {
        label: "Model",
        data: model,
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
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
        borderWidth: 1,
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
            size: 20,
            weight: "normal",
            family: "system-ui",
          },
        },
        subtitle: {
          display: true,
          text: subtitleText,
          font: {
            size: 15,
            family: "system-ui",
          },
          align: "center",
        },
        legend: {
          labels: {
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
                    lineWidth: 1,
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
          },
          ticks: {
            stepSize: 10,
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: `out (${outDBUnits})`,
          },
          ticks: {
            stepSize: 10 * ratio,
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
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.position = "absolute";
  const rect = plotCanvas.getBoundingClientRect();
  // position the table on the lower right of the canvas (make responsive for different screen sizes)
  tableDiv.style.top = rect.bottom - 200 + "px";
  tableDiv.style.right = 100 + "px";

  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
  plotCanvas.parentNode.appendChild(tableDiv);
};

export const plotForAllHz = (
  plotCanvas,
  calibrationResults,
  title,
  calibrationGoal,
  isLoudspeakerCalibration,
  backgroundNoise = {}
) => {
  const subtitleText =
    calibrationGoal === "system"
      ? "Loudspeaker + Microphone"
      : isLoudspeakerCalibration
      ? "Loudspeaker"
      : "Microphone";
  const unconvMergedDataPoints = calibrationResults.unconv.x.map((x, i) => {
    return { x: x, y: 10 * Math.log10(calibrationResults.unconv.y[i]) };
  });

  const convMergedDataPoints = calibrationResults.conv.x.map((x, i) => {
    return { x: x, y: 10 * Math.log10(calibrationResults.conv.y[i]) };
  });

  const backgroundMergedDataPoints = backgroundNoise.x_background
    ? backgroundNoise.x_background.map((x, i) => {
        return { x: x, y: 10 * Math.log10(backgroundNoise.y_background[i]) };
      })
    : [];

  // sort the data points by x
  unconvMergedDataPoints.sort((a, b) => a.x - b.x);
  convMergedDataPoints.sort((a, b) => a.x - b.x);
  backgroundMergedDataPoints.sort((a, b) => a.x - b.x);

  const datasets = [
    {
      label: "Unfiltered",
      data: unconvMergedDataPoints,
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderColor: "rgba(255, 99, 132, 1)",
      borderWidth: 1,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
    },
    {
      label: "Filtered",
      data: convMergedDataPoints,
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgba(54, 162, 235, 1)",
      borderWidth: 1,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
    },
  ];

  if (backgroundMergedDataPoints.length > 0) {
    datasets.push({
      label: "Background",
      data: backgroundMergedDataPoints,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderColor: "rgba(0, 0, 0, 1)",
      borderWidth: 1,
      pointRadius: 0,
      // pointHoverRadius: 5,
      showLine: true,
    });
  }

  const data = {
    datasets: datasets,
  };

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
          text: title,
          font: {
            size: 18,
            weight: "normal",
            family: "system-ui",
          },
        },
        subtitle: {
          display: true,
          text: subtitleText,
          font: {
            size: 15,
            family: "system-ui",
          },
          align: "center",
        },
        legend: {
          labels: {
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
                    lineWidth: 1,
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
              size: "12px",
            },
          },
          min: 20,
          max: 16000,
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Recording (dB)",
            font: {
              size: "12px",
            },
          },
        },
      },
    },
    plugins: [plugin],
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

  // add the table to the lower left of the canvas. Adjust the position of the table based on the canvas size
  const tableDiv = document.createElement("div");
  tableDiv.appendChild(table);
  tableDiv.style.position = "absolute";
  plotCanvas.parentNode.appendChild(tableDiv);
  const rect = plotCanvas.getBoundingClientRect();
  tableDiv.style.top = rect.bottom - 230 + "px";
  tableDiv.style.left = 120 + "px";

  // make the table on top of the canvas
  tableDiv.style.zIndex = 1;
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
  return std;
};

const average = (data) => {
  const sum = data.reduce((sum, value) => {
    return sum + value;
  }, 0);

  const avg = sum / data.length;
  return avg;
};
