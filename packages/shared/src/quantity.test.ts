import { describe, expect, it } from "vitest";
import type { Unit } from "./enums.js";
import { applyStep, stepFor } from "./quantity.js";

describe("stepFor", () => {
  it.each<[Unit, number]>([
    ["PIECE", 1],
    ["PACK", 1],
    ["BUNCH", 1],
    ["GRAM", 50],
    ["MILLILITER", 100],
  ])("%s の刻み幅は %d", (unit, expected) => {
    expect(stepFor(unit)).toBe(expected);
  });
});

describe("applyStep", () => {
  it("GRAM は +50 / -50 で増減する", () => {
    expect(applyStep(300, "GRAM", 1)).toBe(350);
    expect(applyStep(300, "GRAM", -1)).toBe(250);
  });

  it("PIECE は +1 / -1 で増減する", () => {
    expect(applyStep(2, "PIECE", 1)).toBe(3);
    expect(applyStep(2, "PIECE", -1)).toBe(1);
  });

  it("0 未満にはならない", () => {
    expect(applyStep(30, "GRAM", -1)).toBe(0);
    expect(applyStep(0, "PIECE", -1)).toBe(0);
  });
});
