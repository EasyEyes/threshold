/// Like utils.js, but .ts

export const styleNodeAndChildrenRecursively = (
  elem: HTMLElement,
  attrs: { [key: string]: string },
) => {
  setStyleAttribute(elem, attrs);
  for (let e of [...elem.getElementsByTagName("*")]) {
    setStyleAttribute(e as HTMLElement, attrs);
  }
};
// https://stackoverflow.com/questions/37655393/how-to-set-multiple-css-style-properties-in-typescript-for-an-element
export const setStyleAttribute = (
  element: HTMLElement,
  attrs: { [key: string]: string },
) => {
  for (const [key, value] of Object.entries(attrs)) {
    element.style.setProperty(key, value, "important");
  }
};
