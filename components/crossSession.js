import { localStorageKey } from "./global";

export const checkCrossSessionId = async (callback) => {
  const localStorageInfo = JSON.parse(localStorage.getItem(localStorageKey));

  let storedId = undefined;
  if (localStorageInfo && localStorageInfo.participant)
    storedId = localStorageInfo.participant;
  const hasStoredId = storedId !== undefined;

  let id = await Swal.fire({
    title: "Participant ID Requested",
    html: hasStoredId
      ? `We found that you participated in a previous session at <b>${preprocessPsychoJSTime(
          localStorageInfo.date
        )}</b>. The participant ID is <b>${storedId}</b>. Press OK if it's correct, or enter a new one and continue.`
      : "The researcher requested you to provide your participant ID from the previous session, please type it here, or upload the file downloaded when the last session ends.",
    // inputLabel:
    input: "text",
    inputValue: hasStoredId ? storedId : "",
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    showDenyButton: true,
    showConfirmButton: true,
    allowEnterKey: false,
    allowOutsideClick: false,
    allowEscapeKey: false,

    cancelButtonText: "Upload EasyEyes ID file",
    denyButtonText: `I don't have an ID`,

    customClass: {
      popup: "narrow-popup id-collection-popup",
      title: "centered-title",
      confirmButton: `threshold-button`,
      cancelButton: `threshold-button`,
      denyButton: `threshold-button`,
    },
    showClass: {
      popup: "fade-in",
    },
    hideClass: {
      popup: "",
    },

    preConfirm: (id) => {
      if (id && id.length < 5) {
        Swal.showValidationMessage("The participant ID is invalid.");
        return false;
      }
    },
  });

  if (id.isDenied) {
    return false;
  } else if (id.isConfirmed) {
    callback(id.value, localStorageInfo.session);
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
        confirmButton: `threshold-button`,
        denyButton: `threshold-button`,
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
        const participant = e.target.result
          .split("\n")[1]
          .split(":")[1]
          .replace(/ /, "");
        const session = e.target.result
          .split("\n")[2]
          .split(":")[1]
          .replace(/ /, "");
        callback(participant, session);
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
