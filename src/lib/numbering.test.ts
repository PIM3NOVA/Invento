import { describe, expect, it, vi } from "vitest";
import { nextDocumentNumber } from "./numbering";

const OCT_2026 = new Date(2026, 9, 22);

describe("nextDocumentNumber", () => {
  it("zaczyna od 0001, gdy w miesiącu nie ma dokumentów", async () => {
    const findLast = vi.fn().mockResolvedValue(null);
    await expect(nextDocumentNumber("FV", findLast, OCT_2026)).resolves.toBe("FV/2026/10/0001");
    expect(findLast).toHaveBeenCalledWith("FV/2026/10/");
  });

  it("zwiększa ostatni numer o 1", async () => {
    const findLast = vi.fn().mockResolvedValue("FV/2026/10/0007");
    await expect(nextDocumentNumber("FV", findLast, OCT_2026)).resolves.toBe("FV/2026/10/0008");
  });

  it("dopełnia numer zerami do 4 cyfr", async () => {
    const findLast = vi.fn().mockResolvedValue("WZ/2026/10/0099");
    await expect(nextDocumentNumber("WZ", findLast, OCT_2026)).resolves.toBe("WZ/2026/10/0100");
  });

  it("używa dwucyfrowego miesiąca w prefiksie", async () => {
    const findLast = vi.fn().mockResolvedValue(undefined);
    await expect(nextDocumentNumber("PZ", findLast, new Date(2027, 0, 5))).resolves.toBe(
      "PZ/2027/01/0001",
    );
  });
});
