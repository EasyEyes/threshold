import Swal from "sweetalert2";
import { localStorageKey } from "./global";
import { readi18nPhrases } from "./readPhrases";
import { sleep } from "./utils";

export const checkCrossSessionId = async (callback, language) => {
  return new Promise((resolve, reject) => {
    const localStorageInfo = JSON.parse(localStorage.getItem(localStorageKey));
    let storedId = undefined;
    let detailInformation = readi18nPhrases("EE_ID", language);
    const briefInformation = readi18nPhrases("EE_ID_noLocalStorage", language);
    const languageDirection = readi18nPhrases("EE_languageDirection", language);
    if (localStorageInfo && localStorageInfo.EasyEyesID)
      storedId = localStorageInfo.EasyEyesID;
    const hasStoredId = storedId !== undefined;
    if (hasStoredId) {
      detailInformation = detailInformation.replace(
        "**ddd**",
        "<b>" + preprocessPsychoJSTime(localStorageInfo.date) + "</b>",
      );
      detailInformation = detailInformation.replace(
        "**[[DDD]]**",
        "<b>" + preprocessPsychoJSTime(localStorageInfo.date) + "</b>",
      );
      detailInformation = detailInformation.replace(
        "** [[ddd]] **",
        "<b>" + preprocessPsychoJSTime(localStorageInfo.date) + "</b>",
      );
      detailInformation = detailInformation.replace(
        "** sss**",
        "<b>" + storedId + "</b>",
      );
      detailInformation = detailInformation.replace(
        "**sss**",
        "<b>" + storedId + "</b>",
      );
      detailInformation = detailInformation.replace(
        "** SSS **",
        "<b>" + storedId + "</b>",
      );
      if (languageDirection == "LTR") {
        detailInformation =
          "<div dir='ltr' style='text-align:left'>" +
          detailInformation +
          "</div>";
      } else if (languageDirection == "RTL") {
        detailInformation =
          "<div dir='rtl' style='text-align:right'>" +
          detailInformation +
          "</div>";
      }
    }
    Swal.fire({
      title: readi18nPhrases("EE_IDRequested", language),
      html: hasStoredId
        ? detailInformation +
          `<div style="margin:2% 0% 2% 0%" class="row align-items-center">
            <div class="col-9">
              <input type="text" value="` +
          storedId +
          `" id="textInput" style="max-width: 100%; font-size:larger" class="form-control" aria-label="Larger">
            </div>
            <div class="col-3">
              <button id="okaybtn" class="btn btn-lg btn-dark">` +
          readi18nPhrases("EE_ok", language) +
          `</button>
            </div>
          </div>
          <div class="row" style="font-size:large; text-align:left; margin:2% 0% 2% 0.5%">
            <div class="col-12" style="padding:1%">
              <input type="file" style="display:none;" title="" accept=".txt" id="fileInput" class="swal2-file">
              <button class="btn btn-secondary" style="padding:0.5% 2% 0.5% 2%;align-items: center;">
                <label style="padding:0px" for="fileInput">` +
          readi18nPhrases("EE_browseForID", language) +
          `</label>
              </button>
              <span id="labelFile" style="margin-left:1%">` +
          readi18nPhrases("EE_noFileSelected", language) +
          `</span
            </div>
          </div>`
        : briefInformation +
          `<div style="margin:2% 0% 2% 0%" class="row align-items-center">
            <div class="col-9">
              <input type="text" id="textInput" style="max-width: 100%; font-size:larger" class="form-control" aria-label="Larger">
            </div>
            <div class="col-3">
              <button id="okaybtn" class="btn btn-lg btn-dark">` +
          readi18nPhrases("EE_ok", language) +
          `</button>
            </div>
          </div>
          <div class="row" style="font-size:large; text-align:left; margin:2% 0% 2% 0.5%">
            <div class="col-12" style="padding:1%">
              <input type="file" style="display:none;" title="" accept=".txt" id="fileInput" class="swal2-file">
              <button class="btn btn-secondary" style="padding:0.5% 2% 0.5% 2%;align-items: center;">
                <label style="padding:0px" for="fileInput">` +
          readi18nPhrases("EE_browseForID", language) +
          `</label>
              </button>
              <span id="labelFile" style="margin-left:1%">` +
          readi18nPhrases("EE_noFileSelected", language) +
          `</span
            </div>
          </div>`,
      // `<center>
      //   <input type="text" id="textInput" class="swal2-input">
      // </center>
      // <input type="file" accept=".txt" id="fileInput" class="swal2-file">`,
      //confirmButtonText: readi18nPhrases("EE_ok", language),
      showConfirmButton: false,
      customClass: {
        popup: "narrow-popup id-collection-popup",
        title: "centered-title",
      },
      showClass: {
        popup: "fade-in",
      },
      hideClass: {
        popup: "",
      },
      // preConfirm: (id) => {
      //   let text = textInput.value;
      //   let file = fileInput.files[0];
      //   if (!file) {
      //     if (!text || text.length < 1) {
      //       const uploadOrValidIDError =
      //         readi18nPhrases("EE_ID_uploadOrValidID", language);
      //       Swal.showValidationMessage(uploadOrValidIDError);
      //       return false;
      //     }
      //     if (!/^[A-Za-z0-9]*$/.test(text)) {
      //       const invalidIDError = readi18nPhrases("EE_ID_invalidID", language);
      //       Swal.showValidationMessage(invalidIDError);
      //       return false;
      //     }
      //     callback(
      //       text,
      //       localStorageInfo ? localStorageInfo.session : null,
      //       storedId
      //     );
      //     return true;
      //   } else {
      //     const reader = new FileReader();
      //     reader.onload = (e) => {
      //       const participant = e.target.result.split("\n")[2].split(/\s+/g)[1];
      //       const session = e.target.result.split("\n")[3].split(/\s+/g)[1];
      //       callback(participant, session, participant);
      //     };
      //     reader.readAsText(file);
      //     return true;
      //   }
      // },
    }).then((result) => {
      if (result.isConfirmed) {
        resolve(true);
      }
    });
    let fileInput = document.getElementById("fileInput");
    let textField = document.getElementById("textInput");
    let okayBtn = document.getElementById("okaybtn");
    okayBtn.onclick = () => {
      console.log("Okay pressed");
      let text = document.getElementById("textInput").value;
      let file = document.getElementById("fileInput").files[0];
      if (!text || text.length < 1) {
        const uploadOrValidIDError = readi18nPhrases(
          "EE_ID_uploadOrValidID",
          language,
        );
        Swal.showValidationMessage(uploadOrValidIDError);
        // return false;
      } else if (!/^[A-Za-z0-9_\–\-\.]*$/.test(text)) {
        console.log(text);
        const invalidIDError = readi18nPhrases("EE_ID_invalidID", language);
        Swal.showValidationMessage(invalidIDError);
        // return false;
      } else {
        callback(
          text,
          localStorageInfo ? localStorageInfo.session : null,
          storedId,
        );
        // return true;
        Swal.clickConfirm();
      }
    };
    fileInput.onchange = () => {
      let file = fileInput.files[0];
      let labelFile = document.getElementById("labelFile");
      labelFile.innerHTML = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (
          e.target.result.split("\n")[0] ===
          "Please keep this file to facilitate participation in future sessions. When an experiment has several sessions, you can use this file to connect them, while retaining your anonymity."
        ) {
          const participant = e.target.result.split("\n")[2].split(/\s+/g)[1];
          // const session = e.target.result.split("\n")[3].split(/\s+/g)[1];
          textField.value = participant;
          Swal.resetValidationMessage();
        } else {
          const invalidFileError = readi18nPhrases(
            "EE_ID_invalidFile",
            language,
          );
          Swal.showValidationMessage(invalidFileError);
        }
      };
      reader.readAsText(file);
    };
    /*let id = await Swal.fire({
      title: readi18nPhrases("EE_IDRequested", language),
      html: hasStoredId
        ? detailInformation
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
  
      cancelButtonText: readi18nPhrases("EE_browseForID", language), // grey
      //denyButtonText: `I don't have EasyEyes ID`, // red
      confirmButtonText: readi18nPhrases("EE_ok", language),
  
      customClass: {
        popup: "narrow-popup id-collection-popup",
        title: "centered-title",
        confirmButton: `threshold-button order-1`,
        cancelButton: `threshold-button order-2`,
        //denyButton: `threshold-button order-3`,
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
        return checkCrossSessionId(callback, language);
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
    }*/
  });
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
