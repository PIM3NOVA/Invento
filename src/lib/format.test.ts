import { describe, expect, it } from "vitest";
import { groszeToInput, inputToGrosze, plural } from "./format";

describe("plural", () => {
  const forms: [string, string, string] = ["faktura", "faktury", "faktur"];

  it.each([
    [0, "0 faktur"],
    [1, "1 faktura"],
    [2, "2 faktury"],
    [4, "4 faktury"],
    [5, "5 faktur"],
    [12, "12 faktur"],
    [14, "14 faktur"],
    [22, "22 faktury"],
    [25, "25 faktur"],
    [101, "101 faktur"],
    [112, "112 faktur"],
    [122, "122 faktury"],
  ])("%i -> %s", (n, expected) => {
    expect(plural(n, forms)).toBe(expected);
  });
});

describe("inputToGrosze", () => {
  it.each([
    ["12,99", 1299],
    ["12.99", 1299],
    ["1 299,50", 129950],
    ["0,1", 10],
    ["19.99", 1999], // 19.99 * 100 = 1998.9999… w arytmetyce zmiennoprzecinkowej
  ])("%s -> %i", (value, expected) => {
    expect(inputToGrosze(value)).toBe(expected);
  });
});

describe("groszeToInput", () => {
  it("zwraca wartość z dwoma miejscami po przecinku", () => {
    expect(groszeToInput(1299)).toBe("12.99");
    expect(groszeToInput(500)).toBe("5.00");
  });

  it("jest odwrotnością inputToGrosze", () => {
    for (const grosze of [0, 1, 99, 1299, 100000]) {
      expect(inputToGrosze(groszeToInput(grosze))).toBe(grosze);
    }
  });
});
