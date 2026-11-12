export const replacePlaceholders = (s, ...a) => {
  if (a.length === 1)
    return s.replace(/\[\[xxx\]\]/gi, a[0]).replace(/\[\[N11\]\]/gi, a[0]);

  for (let i in a) {
    const stripped_i = i.replace("[[N", "").replace("]]", "");
    const n = Number(stripped_i) + 1;
    const n_str = String(n);
    const n_placeholder_str = n_str.repeat(2);
    s = s.replace("[[N" + n_placeholder_str + "]]", a[i]);
  }
  return s;
};
