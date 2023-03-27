import { psychoJS } from "./globalPsychoJS.js";
import { quitPsychoJS } from "./lifetime.js";
import { showCursor } from "./utils.js";

// ! EXPERIMENTAL
// https://stackoverflow.com/a/73956189
// console.warn(
//   "[EasyEyesPromise] Customized Promise used. This affects the performance and cause errors."
// );
// window.Promise = class EasyEyesPromise extends Promise {
//   constructor() {
//     super(...arguments);
//     this.__creationPoint = new Error().stack;
//   }
// };

export const buildWindowErrorHandling = (paramReader) => {
  window.onerror = (message, source, lineno, colno, error) => {
    console.log("onerror");
    showCursor();

    const errorMessage = JSON.stringify({
      message: message,
      source: source,
      lineno: lineno,
      colno: colno,
      error: error,
    });

    // save data
    console.error(error);
    psychoJS.experiment.addData("error", errorMessage);

    // psychoJS default behavior
    document.body.setAttribute("data-error", errorMessage);

    // quit with message
    psychoJS._gui.dialog({ error: error });
    setTimeout(() => {
      quitPsychoJS("", false, paramReader);
    }, 5000);

    return true;
  };

  window.onunhandledrejection = function (error) {
    console.log("onunhandledrejection");
    showCursor();

    // save data
    console.log(error);

    // psychoJS default behavior
    if (error?.reason?.stack) {
      // stack from reason
      const errorMessage = `STACK ${JSON.stringify(
        error?.reason?.stack || error?.stack
      )}\nREASON ${JSON.stringify(error?.reason)}`;
      document.body.setAttribute("data-error", errorMessage);

      try {
        psychoJS.experiment.addData("error", errorMessage);
      } catch (exception) {
        console.error(
          "Failed to add error to experiment data. Perhaps psychoJS.experiment is undefined.",
          exception
        );
      }
    } else {
      // no stack from reason
      const errorMessage = `STACK ${JSON.stringify(
        error?.stack
      )}\nERROR ${error}\nREASON ${JSON.stringify(error?.reason)}`;
      document.body.setAttribute("data-error", errorMessage);
      psychoJS.experiment.addData("error", errorMessage);
    }

    // quit
    psychoJS._gui.dialog({
      error: error?.reason,
      showOK: true,
      onOK: () => {
        quitPsychoJS("", false, paramReader);
      },
      okText: "Report error to the EasyEyes team",
    });

    return true;
  };
};

/**
 * Log a non-fatal error as a warning, so the experimenter can know that some unspecified behavior occured.
 * @param {string} message Message describing this non-fatal error
 */
export const warning = (message) => {
  try {
    psychoJS.experiment.addData("warning", message);
    console.warn(message);
  } catch (exception) {
    // TODO should failure to log a warning result in a fatal error?
    console.error(
      "Failed to add warning: " +
        message +
        " to experiment data. Perhaps psychoJS.experiment is undefined.",
      exception
    );
  }
};
