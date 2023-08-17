import { Chart } from "chart.js/auto";
import { SoundLevelModel } from "./soundTest";
import {
  calibrateSoundBurstRepeats,
  calibrateSoundBurstSec,
  calibrateSoundBurstsWarmup,
  calibrateSoundHz,
} from "./global";

export const plotSoundLevels1000Hz = (
  plotCanvas,
  parameters,
  soundLevels,
  outDBSPL1000Values,
  title
) => {
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
            text: "in (dB)",
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
            text: "out (dB SPL)",
          },
          ticks: {
            stepSize: 10 * ratio,
          },
        },
      },
    },
  };
  const plot = new Chart(plotCanvas, config);
};

export const plotForAllHz = (
  plotCanvas,
  iir = [],
  calibrationResults,
  title
) => {
  const unconvMergedDataPoints = calibrationResults.x_unconv.map((x, i) => {
    return { x: calibrationResults.y_unconv[i], y: 10 * Math.log10(x) };
  });

  const convMergedDataPoints = calibrationResults.x_conv.map((x, i) => {
    return { x: calibrationResults.y_conv[i], y: 10 * Math.log10(x) };
  });

  // sort the data points by x
  unconvMergedDataPoints.sort((a, b) => a.x - b.x);
  convMergedDataPoints.sort((a, b) => a.x - b.x);

  const data = {
    datasets: [
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
    ],
  };

  // compute standard deviation of the filtered data points from 400 to 8000 Hz (frequency is x-axis)
  const filteredDataPoints = convMergedDataPoints.filter(
    (point) => point.x >= 400 && point.x <= 8000
  );
  const filteredDataPointsY = filteredDataPoints.map((point) => point.y);
  const sd = standardDeviation(filteredDataPointsY);

  const subtitleText = [
    `Frequency response calibrated with ${calibrateSoundBurstRepeats.current} repeats (after ${calibrateSoundBurstsWarmup.current} warmup) of a ${calibrateSoundBurstSec.current} sec burst, sampled at ${calibrateSoundHz.current} Hz.`,
    `From 400 to 8000 Hz, the IIR-filtered MLS recording has SD = ${sd} dB.`,
  ];
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
        },
        subtitle: {
          display: true,
          text: subtitleText,
          position: "bottom",
          font: {
            size: 13,
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
          },
        },
      },
    },
  };

  const plot = new Chart(plotCanvas, config);
};

const standardDeviation = (values) => {
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
