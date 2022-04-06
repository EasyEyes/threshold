import { psychoJS } from "./globalPsychoJS.js";
import { quitPsychoJS } from "./lifetime.js";

export const buildWindowErrorHandling = (paramReader) => {
  window.onerror = (message, source, lineno, colno, error) => {
    console.log("onerror");

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
    // save data
    console.error(error?.reason);

    // psychoJS default behavior
    if (error?.reason?.stack === undefined) {
      document.body.setAttribute("data-error", JSON.stringify(error?.reason));
      psychoJS.experiment.addData("error", JSON.stringify(error?.reason));
    } else {
      document.body.setAttribute(
        "data-error",
        JSON.stringify(error?.reason?.stack)
      );
      try {
        psychoJS.experiment.addData(
          "error",
          JSON.stringify(error?.reason?.stack)
        );
      } catch (e) {
        console.error("No psychoJS.experiment to add error data to.", e);
      }
    }

    // quit
    psychoJS._gui.dialog({ error: error?.reason });
    setTimeout(() => {
      quitPsychoJS("", false, paramReader);
    }, 5000);

    return true;
  };
};
