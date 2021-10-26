const ALPHABET_CONSTANTS = ["ESC", "SPACE"];

function waitALittle(time = 250) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
export async function getQRCodeImage(receiver) {
  const qrImage = new Image();
  qrImage.setAttribute("id", "qrImage");
  qrImage.style.zIndex = 9000;
  while (!receiver.qrURI) {
    await waitALittle(10);
  }
  qrImage.src = receiver.qrURI;
  return qrImage;
}
