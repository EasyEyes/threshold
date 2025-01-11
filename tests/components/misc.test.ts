import { findLongestMatchingTail } from "../../components/misc";

// eg how much of the end of A can be used together as a string that's found in B?
describe("findLongestMatchingTail", () => {
  test("empty A", () => {
    expect(findLongestMatchingTail("", "dog cat sat on mat")).toBe("");
  });

  test("empty B", () => {
    expect(findLongestMatchingTail("start the cat sat", "")).toBe("");
  });

  test("finds exact match at end", () => {
    expect(
      findLongestMatchingTail("start the cat sat", "the cat sat on mat"),
    ).toBe("the cat sat");
  });

  test("finds partial match at end", () => {
    expect(
      findLongestMatchingTail("start the cat sat", "dog cat sat on mat"),
    ).toBe("cat sat");
  });

  test("returns empty when no match", () => {
    expect(findLongestMatchingTail("start the cat sat", "dog ran fast")).toBe(
      "",
    );
  });

  test("respects maxWords", () => {
    expect(findLongestMatchingTail("start the cat sat", "the cat sat", 2)).toBe(
      "cat sat",
    );
  });
});
