import { multiply, transpose } from "mathjs";
const lin2pq = (L) => {
  // Convert from absolute linear values (between 0.005 and 10000) to PQ-encoded values V (between 0 and 1)
  const Lmax = 10000;
  //Lmin = 0.005
  const n = 0.1593017578125;
  const m = 78.84375;
  const c1 = 0.8359375;
  const c2 = 18.8515625;
  const c3 = 18.6875;
  let im_t = new Array(L.length)
    .fill(0)
    .map(() => new Array(L[0].length).fill(0));
  for (let i = 0; i < L.length; i++) {
    for (let j = 0; j < L[0].length; j++) {
      if (L[i][j] < 0) {
        im_t[i][j] = 0;
      } else if (L[i][j] > Lmax) {
        im_t[i][j] = Math.pow(1.0, n);
      } else {
        im_t[i][j] = Math.pow(L[i][j] / Lmax, n);
      }
    }
  }
  let V = new Array(L.length).fill(0).map(() => new Array(L[0].length).fill(0));
  for (let i = 0; i < L.length; i++) {
    for (let j = 0; j < L[0].length; j++) {
      V[i][j] = Math.pow((c2 * im_t[i][j] + c1) / (1 + c3 * im_t[i][j]), m);
    }
  }
  return V;
};

const pq2lin = (V) => {
  // Convert from PQ-encoded values V (between 0 and 1) to absolute linear values (between 0.005 and 10000)
  const Lmax = 10000;
  const n = 0.1593017578125;
  const m = 78.84375;
  const c1 = 0.8359375;
  const c2 = 18.8515625;
  const c3 = 18.6875;

  // const im_t = Math.pow(Math.max(V, 0), 1/m)
  // const L = Lmax * Math.pow(Math.max(im_t - c1, 0) / (c2 - c3*im_t), 1/n)
  return L;
};

// const im2colvec = (im) => {
//     // Check if im is already a colour vector
//     // if (im.length === im[0].length && im[0].length === 3) {
//     //   return im;
//     // }

//     // Check if im is a valid image

//     if (im[0][0].length !== 3) {
//       throw new Error("Invalid image: image must have shape [height, width, 3]");
//     }

//     const npix = im.length * im[0].length;
//     const im_flat = im.flat(2);
//     const im_2d = im_flat.reduce((acc, _, i) => {
//       const row = Math.floor(i / 3);
//       const col = i % 3;
//       acc[row][col] = im_flat[i];
//       return acc;
//     }, Array.from({ length: npix }, () => [0, 0, 0]));

//     return im_2d;
// }

const __rgb2020_2xyz = [
  [0.637, 0.1446, 0.1689],
  [0.2627, 0.678, 0.0593],
  [0.0, 0.0281, 1.061],
];

const __xyz2rgb2020 = [
  [1.716502508360628, -0.355584689096764, -0.25337521357085],
  [-0.666625609145029, 1.616446566522207, 0.015775479726511],
  [0.017655211703087, -0.042810696059636, 0.942089263920533],
];

// Recipes for converting from a given colour space to CIE XYZ 1931
// First value - non-linear conversion function (or None), second - colour conversion matrix
const __to_xyz_cforms = {
  rgb2020: [null, __rgb2020_2xyz],
  pq_rgb: [pq2lin, __rgb2020_2xyz],
};

// Recipes for converting from CIE XYZ 1931 to a given colour space
// First value - colour transform matrix, second column - non-linear conversion function (or None)
const __from_xyz_cforms = {
  rgb2020: [__xyz2rgb2020, null],
  pq_rgb: [__xyz2rgb2020, lin2pq],
};

export const im_ctrans = (
  im,
  fromCS = null,
  toCS = null,
  M = null,
  exposure = 100
) => {
  /*Transform an image or a colour vector from one colour space into another
    Parameters:
    in - either an image as (width, height, 3) array or (n, 3) colour vector
    fromCS, toCS - strings with the name of the input and output colour spaces. 
                   Linear colour spaces: rgb709, rgb2020, xyz, 
                   Non-linear colour spaces: pq_rgb (BT.2020), srgb (BT.709), Yxy
    M - if fromCS and toCS are not specified, you must pass the colour transformation matrix as M 
        (default is None)
    exposure - The colour values are multiplied (in linear space) by the value of the `exposure`. 
               Default is 1. This parameter is useful when converting between relative and absolute 
               colour spaces, for example:

               im_ctrans(im, "srgb", "pq_rgb", exposure=100)

               will map peak white (1,1,1) in sRGB to (100,100,100) or 100 cd/m^2 D65 in BT.2020. 

    Returns:
    An image or colour vector in the new colour space.
    """
    */
  // let col_vec = im2colvec(im)
  let col_vec = im;
  console.log("col_vec", col_vec);
  if (fromCS != null) {
    var [nl_func, in2xyz] = __to_xyz_cforms[fromCS];
    if (nl_func != null) {
      col_vec = nl_func(col_vec);
    }
  }
  if (toCS != null) {
    var [xyz2out, to_nl_func] = __from_xyz_cforms[toCS];
  } else {
    to_nl_func = null;
  }
  if (M == null) {
    M = multiply(xyz2out, in2xyz);
  }
  let transposeM = transpose(M);
  let col_vec_out = multiply(col_vec, multiply(transposeM, exposure));
  console.log("col_vec_out", col_vec_out);
  if (to_nl_func != null) {
    // Non-linearity, if needed
    col_vec_out = to_nl_func(col_vec_out);
  }
  return col_vec_out;
};
