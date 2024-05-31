import { isNumeric } from "./utils";

// Compiler support of a vector, or
// a (possibly fixed-length) homogenous array of floats (numerical) or integers (integer)

/**
 * Original spec:
 *
 *
 * Enhance the compiler to accept and check a vector provided by the scientist
 * in one text cell of the experiment file. In the INPUT GLOSSARY, the EasyEyes
 * compiler now accepts types numerical (i.e. float) and integer. We will
 * enhance the compiler to also accept *numerical,* integer (both with
 * unspecified nonzero length), 2*numerical, and 2*integer (where length
 * is optionally specified by the leading "2", which can be any positive
 * nonzero integer) to specify a comma-separated list of numbers or
 * integers. The type request, e.g. 2*integer, cannot include any spaces
 * or commas. An unrecognized type provokes a fatal compiler error.
 *
 * The leading number is optional, so the specifications *numerical and
 * *integer indicate comma-separated lists of unspecified nonzero length.
 * As always, if the parameter is omitted or specified with an empty cell,
 * it will be assigned the parameter’s default value specified in the Glossary.
 *
 * THE NEED. Several parameters now pass a comma-separated list of numbers
 * as a text string. This works, but is not checked by the compiler, so any
 * problem is discovered at runtime, which is bad. By specifying the list
 * type and length, we allow the compiler to check it.
 *
 * ANECDOTES. In recent experience we had mysterious failures due to my
 * omitting a comma. The EasyEyes code could not parse "-11 -11" as a number.
 * In another case I put the space in the wrong place and EasyEyes choked
 * trying to process "- 12" as a number. It would have saved an hour of work
 * and a day of scheduling to have the compiler catch and report the error,
 * and prevent the experiment from running, instead of later failing at runtime.
 *
 * These new types require the scientist to either:
 * 1. leave the cell empty (requesting whatever the default is)
 * or
 * 2. provide a comma-separated list of values, e.g. “-1.1, 3" with the
 * specified list length, or any nonzero length if the format has no integer
 * specifying length.
 *
 * This is a bit like questionAndAnswer, which accepts several strings separated
 * by “|”.
 *
 * Apologies to Europeans who use the comma as the decimal marker. This scheme
 * reserves the comma as a separator.
 *
 * COMMA-SEPARATED LIST: Numbers must be separated by commas. The number does
 * not include any space or comma. Each number can be preceded and followed
 * by zero or more spaces.
 *
 * The compiler will check every element for validity. Numerical values
 * include 17, -17, 0x3A, -0x3A, 1.0, -1., 1.1e6, -1.1e6, inf, -inf, and nan.
 * Ignore the upper/lower case of e, inf, and nan. Accept nan and inf only
 * for numerical.
 *
 * Ignore leading and trailing white space. Reject partial lists. The
 * scientist must provide all the listed values for the parameter or leave
 * the cell empty. The whole list will have a default, just like other
 * parameters, and the default applies to the whole list, not elements of the
 * list. If the parameter is omitted or empty, then the default is used. Once
 * we adopt comma-separated vectors, we'll make that the type of many existing
 * parameters which now use type text to pass several numbers.
 *
 * Allow hexadecimal integers, like 0xA3 and -0xB5. The compiler will require
 * that any hexadecimal number begin with the prefix "0x" if it's positive,
 * or "-0x" if it's negative. The X may be lower or uppercase.
 *
 * EXAMPLE. If the type is “2*numerical" then the compiler will
 * ACCEPT: 1, 2 1.1e5, 0xA3
 * REJECT:
 * ”1” because too few
 * ”1, 2, 3” because too many
 * “1-1” because it's an expression, not a number
 * “- 1” because it’s not a legal number.
 * “A43” because hex numbers require the 0x prefix
 */

// TODO handle inf & nan in threshold
const isNumerical = (s: string): boolean => {
  return (
    isNumeric(s) || ["inf", "nan"].includes(s.replace(/-/g, "").toLowerCase())
  );
};
// SEE https://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript
const isInteger = (s: string) => {
  const x = s as unknown as number;
  return (
    !isNaN(x) &&
    parseInt(Number(s) as unknown as string) == x &&
    !isNaN(parseInt(s, 10))
  );
};
const isNum = (s: string) => isInteger(s) || isNumerical(s);

const isValidVectorShapeSpecifier = (s: string): boolean => {
  // Must include an asterisk
  if (!s.includes("*")) return false;
  const sansWhitespace = s.trim();
  const l = sansWhitespace.split("*");
  // Must be two terms seperated by that asterisk (the first time may be empty)
  if (l.length !== 2) return false;
  // The specified length must either be empty or an integer
  if (!(isInteger(l[0]) || l[0] === "")) return false;
  // The type value must either be "numerical" or "integer"
  if (!["numerical", "integer"].includes(l[1])) return false;
  return true;
};
const getVectorLength = (validatedVectorShape: string) => {
  return validatedVectorShape.split("*")[0];
};
const getVectorType = (validatedVectorShape: string) => {
  return validatedVectorShape.split("*")[1];
};
