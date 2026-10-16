// import {Window, PsychoJS } from "../psychojs/src/core/index.js";
// import {TextStim} from "../psychojs/src/visual/index.js";

export function measureFontRenderCanvas() {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = "600pt Verdana";
    ctx.fillText("ABC", 10, 50);
    const loremIpsum =
      "Aliquam qui enim et est. Odit et facere quia sit. Assumenda corporis repellendus molestiae culpa maiores eius debitis. Fugit provident odit qui ea et id molestias. Rerum blanditiis error sit quod ab culpa. Autem labore veritatis natus tempora aspernatur unde. Aut doloribus a et voluptate aut voluptatibus beatae ullam. Delectus enim temporibus eligendi pariatur recusandae quidem qui in. Inventore doloremque magni autem. Facilis iste cupiditate et. Nulla hic commodi et non aliquam nihil. Incidunt aut dolorem reiciendis suscipit nesciunt voluptatem. Fugit quae ullam quis dolores qui. Vel fuga quibusdam ratione. Aperiam aliquid vitae occaecati. Fuga sequi minima quam excepturi architecto autem. Quas possimus fuga esse dolor. Voluptates repellat officia quisquam accusantium. Ullam magni impedit necessitatibus. Rem maxime ea molestias dolores facere blanditiis ducimus. Perferendis dolor odit maxime velit est.";
    const shortText = "XYZ";
    const longText = loremIpsum.repeat(1000);
    const t0 = performance.now();
    ctx.fillText(shortText, 500, 500);
    ctx.measureText(shortText);
    const t1 = performance.now();
    const durationSec = (t1 - t0) / 1000;
    resolve(durationSec);
  });
}

// export function measureFontRenderPsychojs() {
//   return new Promise((resolve) => {
//     const psychoJS = new PsychoJS({
//       debug: true,
//     });
//     const win = new Window({
//       name: "Window",
//       fullscr: false,
//       screen: 0,
//       color: [0, 0, 0],
//       colorSpace: "rgb",
//       units: "height",
//       waitBlanking: true,
//       autoLog: true,
//     });
//     const text = new TextStim({
//       win: win,
//       name: "text",
//       text: "ABC",
//       font: "Arial",
//       pos: [0, 0],
//       height: 0.1,
//       wrapWidth: undefined,
//       ori: 0.0,
//       color: "white",
//       colorSpace: "rgb",
//       opacity: undefined,
//       depth: -4.0,
//     });
//     text.draw();
//     win.flip();
//     const t0 = performance.now();
//     text.setText("XYZ");
//     text.draw();
//     win.flip();
//     const t1 = performance.now();
//     resolve(t1 - t0);
//   });
// }

export function measureHeapAllocation() {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const arr = new Array(12500000).fill(0);
    const t1 = performance.now();
    const durationSec = (t1 - t0) / 1000;
    resolve(durationSec);
  });
}

export function measureFontRender() {
  return new Promise(async (resolve) => {
    try {
      const canvasTime = await measureFontRenderCanvas();
      // const psychojsTime = await measureFontRenderPsychojs();
      resolve(canvasTime);
    } catch (error) {
      console.error("Error calculating measureFontRender", error);
      resolve(-1);
    }
  });
}
