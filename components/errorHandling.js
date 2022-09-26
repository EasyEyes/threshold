import { psychoJS } from "./globalPsychoJS.js";
import { quitPsychoJS } from "./lifetime.js";
import { showCursor } from "./utils.js";

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
    console.error(error?.reason);

    // psychoJS default behavior
    if (error?.reason?.stack === undefined) {
      // no stack from reason
      const errorMessage = `STACK ${JSON.stringify(error?.stack)}`;
      document.body.setAttribute("data-error", errorMessage);
      psychoJS.experiment.addData("error", errorMessage);
    } else {
      // stack from reason
      const errorMessage = `STACK ${JSON.stringify(
        error?.reason?.stack
      )} REASON ${JSON.stringify(error?.reason)}`;
      document.body.setAttribute("data-error", errorMessage);
      try {
        psychoJS.experiment.addData("error", errorMessage);
      } catch (exception) {
        console.error(
          "Failed to add error to experiment data. Perhaps psychoJS.experiment is undefined.",
          exception
        );
      }
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
