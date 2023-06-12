import axios from "axios";
const url =
  "https://easyeyes-server-netlify.netlify.app/.netlify/functions/api/";
// const url = 'http://localhost:9000/.netlify/functions/api/';
export const useMatlab = { current: false };

export async function closeMatlab() {
  //send message to nodejs server to save matlab file and reset messages
  await sendMessage("Save");
  //wait for matlab saving data
  waitForSignal("Saved", () => {
    resetAllMessages();
  });
}
export async function waitForSignal(signalValue, callback) {
  const signal = await checkMatlabMessage();
  if (signal !== signalValue) {
    // Wait for 1 second before checking again
    setTimeout(() => waitForSignal(signalValue, callback), 1000);
  } else {
    // Signal received, invoke the callback function
    callback();
  }
}
export const checkMatlabMessage = async () => {
  const message = await axios
    .get(url + "matlab")
    .then((response) => {
      console.log("response.data", response.data);
      return response.data.message;
    })
    .catch((error) => {
      console.error(error);
    });
  return message;
};

export const sendMessage = async (message) => {
  // send message to node server
  axios
    .post(url + "easyeyes", message)
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
};

export const sendFileName = async (fileName) => {
  axios
    .post(url + "filename", fileName)
    .then((response) => {
      sendMessage("Record");
      console.log(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
};

export const resetAllMessages = () => {
  axios
    .post(url + "filename", "")
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
  axios
    .post(url + "easyeyes", "")
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
  axios
    .post(url + "matlab", "")
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error(error);
    });
};
