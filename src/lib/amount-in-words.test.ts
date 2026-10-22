import { describe, expect, it } from "vitest";
import { amountInWords } from "./amount-in-words";

describe("amountInWords", () => {
  it.each([
    [0, "zero złotych 00/100"],
    [5, "zero złotych 05/100"],
    [100, "jeden złoty 00/100"],
    [200, "dwa złote 00/100"],
    [500, "pięć złotych 00/100"],
    [1100, "jedenaście złotych 00/100"],
    [1200, "dwanaście złotych 00/100"],
    [2200, "dwadzieścia dwa złote 00/100"],
    [2100, "dwadzieścia jeden złotych 00/100"],
    [2500, "dwadzieścia pięć złotych 00/100"],
    [11199, "sto jedenaście złotych 99/100"],
    [123456, "tysiąc dwieście trzydzieści cztery złote 56/100"],
    [200000, "dwa tysiące złotych 00/100"],
    [500000, "pięć tysięcy złotych 00/100"],
    [1200000, "dwanaście tysięcy złotych 00/100"],
    [2200000, "dwadzieścia dwa tysiące złotych 00/100"],
    [100000000, "milion złotych 00/100"],
    [123456789, "milion dwieście trzydzieści cztery tysiące pięćset sześćdziesiąt siedem złotych 89/100"],
  ])("%i gr -> %s", (grosze, expected) => {
    expect(amountInWords(grosze)).toBe(expected);
  });

  it("pomija puste grupy trzycyfrowe", () => {
    // 1 000 001 zł – bez „zero tysięcy”
    expect(amountInWords(100000100)).toBe("milion jeden złotych 00/100");
  });
});
