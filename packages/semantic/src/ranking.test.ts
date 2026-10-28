import { describe, expect, it } from "vitest";
import { rankingRows } from "./index";

const o = { category: "geography_name", period: "date_key", value: "value" };
const r = (geography_name: string | null, date_key: string, value: unknown) => ({ geography_name, date_key, value });

describe("rankingRows", () => {
  it("ranks each member's latest value and leaves out members without one", () => {
    expect(rankingRows([r("A", "2023", 5), r("A", "2024", 7), r("B", "2024", 9), r("C", "2024", null)], o)).toEqual([
      { category: "B", period: "2024", value: 9, rank: 1 },
      { category: "A", period: "2024", value: 7, rank: 2 },
    ]);
  });

  it("orders ties by category and shares rank 1", () => {
    expect(rankingRows([r("Śląskie", "2024", 4), r("Mazowieckie", "2024", 4)], o).map((x) => [x.category, x.rank])).toEqual([
      ["Mazowieckie", 1],
      ["Śląskie", 1],
    ]);
  });

  it("reads numeric strings and picks the latest period whatever the input order", () => {
    expect(rankingRows([r("A", "2024", "3.5"), r("A", "2020", 9)], o)).toEqual([{ category: "A", period: "2024", value: 3.5, rank: 1 }]);
  });

  it("handles no rows and skips a null category", () => {
    expect(rankingRows([], o)).toEqual([]);
    expect(rankingRows([r(null, "2024", 1), r("A", "2024", 2)], o).map((x) => x.category)).toEqual(["A"]);
  });
});
