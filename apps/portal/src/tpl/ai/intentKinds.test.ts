import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { buildView } from "./intent";

const cat = await dummy.catalog();

describe("explorer v3 chart words", () => {
  it("IBCS and matrix requests pick those kinds", () => {
    expect(buildView("płace w Polsce ibcs", cat, "pl").url).toMatch(/chart=columns.*v=column\.ibcs/);
    expect(buildView("bezrobocie macierz płeć wiek", cat, "pl").url).toMatch(/chart=matrix/);
  });
});
