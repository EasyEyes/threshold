import { localStorageKey } from "./global";

export const checkCrossSessionId = async (callback) => {
  const localStorageInfo = JSON.parse(localStorage.getItem(localStorageKey));
  let storedId = undefined;
  if (localStorageInfo && localStorageInfo.EasyEyesID)
    storedId = localStorageInfo.EasyEyesID;
  const hasStoredId = storedId !== undefined;
  let id = await Swal.fire({
    title: "EasyEyes ID Requested",
    html: hasStoredId
      ? `A unique ID is needed to link data across sessions. This computer previously participated in a session at <b>${preprocessPsychoJSTime(
          localStorageInfo.date
        )}</b> with EasyEyes ID <b>${storedId}</b>. Press OK if that's you. Otherwise, if you have an EasyEyes ID file, press the browse button below to open it. If you don't have a file, but know your EasyEyes ID, then type it. Otherwise, just make up your own ID. It can be any alphanumeric string at least 5 characters long. We'll remember it for you on this computer, but if you go to another computer, please take your EasyEyes ID file (the most recent file in your Downloads folder), or at least write down your EasyEyes ID. Using it every time links your data from session to session.`
      : "The researcher requested you to provide your EasyEyes ID from the previous session, please type it here, or upload the file downloaded when the last session ends.",
    // inputLabel:
    input: "text",
    inputValue: hasStoredId ? storedId : "",
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    showDenyButton: false,
    showConfirmButton: true,
    allowEnterKey: false,
    allowOutsideClick: false,
    allowEscapeKey: false,

    cancelButtonText: "Browse for EasyEyesID file", // grey
    denyButtonText: `I don't have EasyEyes ID`, // red

    customClass: {
      popup: "narrow-popup id-collection-popup",
      title: "centered-title",
      confirmButton: `threshold-button order-1`,
      cancelButton: `threshold-button order-2`,
      denyButton: `threshold-button order-3`,
    },
    showClass: {
      popup: "fade-in",
    },
    hideClass: {
      popup: "",
    },

    preConfirm: (id) => {
      if (!id || id.length < 1) {
        Swal.showValidationMessage("The EasyEyes ID is invalid.");
        return false;
      }
      if (!/^[A-Za-z0-9]*$/.test(id)) {
        Swal.showValidationMessage(
          "The EasyEyes ID contains invalid characters. Only letters and numbers are allowed."
        );
        return false;
      }
      return id;
    },
  });
  if (id.isDenied) {
    return false;
  } else if (id.isConfirmed) {
    callback(
      id.value,
      localStorageInfo ? localStorageInfo.session : null,
      storedId
    );
    return true;
  } else if (id.isDismissed) {
    const idFromFile = await Swal.fire({
      title: "Upload EasyEyes ID File",
      html: "Please upload the file downloaded when the last session ended. It's a <code>.txt</code> file, named starting with <code>EasyEyesID_</code>.",
      input: "file",
      inputAttributes: {
        accept: ".txt",
        "aria-label": "Upload the EasyEyes ID file",
      },
      showCancelButton: false,
      showDenyButton: true,
      showConfirmButton: true,
      allowEnterKey: false,
      allowOutsideClick: false,
      allowEscapeKey: false,

      denyButtonText: `I can't find the file`,

      customClass: {
        popup: "narrow-popup id-collection-popup",
        title: "centered-title",
        confirmButton: `threshold-button order-1`,
        // cancelButton: `threshold-button order-2`,
        denyButton: `threshold-button order-3`,
      },
      showClass: {
        popup: "fade-in",
      },
      hideClass: {
        popup: "",
      },

      preConfirm: (id) => {
        if (!id) {
          Swal.showValidationMessage(
            `You must upload a file. Otherwise, please press "I can't find the file".`
          );
          return false;
        }
      },
    });

    if (idFromFile.isDenied) {
      return false;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const participant = e.target.result.split("\n")[2].split(/\s+/g)[1];
        const session = e.target.result.split("\n")[3].split(/\s+/g)[1];
        callback(participant, session, participant);
      };
      reader.readAsText(idFromFile.value);
      return true;
    }
  }
};

const preprocessPsychoJSTime = (date, hasSecond = false) => {
  // 2022-06-03_16h52.47.629 -> 2022-06-03 16:52:47
  const dateTime = date.split("_");
  return (
    dateTime[0] +
    " " +
    dateTime[1].split(".")[0].replace("h", ":") +
    (hasSecond ? `:${dateTime[1].split(".")[1]}` : "")
  );
};
