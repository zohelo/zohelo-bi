import { describe, expect, it } from "vitest";
import { metric } from "@zohelo/semantic";
import { HttpError, catalogSql, membersSql, quote, route, seriesSql, where } from "./query";

const population = metric("population")!;
const noSql = async () => {
  throw new Error("no SQL expected");
};

describe("quote", () => {
  it("neutralises an injection attempt by quoting it", () => {
    expect(quote("x'; DROP")).toBe("'x''; DROP'");
  });

  it("rejects a value longer than 200 characters", () => {
    expect(() => quote("a".repeat(201))).toThrow(HttpError);
    expect(quote("a".repeat(200))).toBe(`'${"a".repeat(200)}'`);
  });

  it("doubles single quotes", () => {
    expect(quote("Côte d'Ivoire")).toBe("'Côte d''Ivoire'");
  });

  it("answers 400 for a bad value", () => {
    try {
      quote("x\\");
    } catch (error) {
      expect((error as HttpError).status).toBe(400);
    }
    expect.assertions(1);
  });
});

describe("where", () => {
  it("ignores parameters not in the manifest", () => {
    expect(where(population, new URLSearchParams({ evil: "1", geography_level: "country" }))).toBe("WHERE geography_level IN ('country')");
  });

  it("is empty without known parameters", () => {
    expect(where(population, new URLSearchParams({ evil: "1" }))).toBe("");
  });
});

describe("SQL", () => {
  it("filters the population series by several areas", () => {
    const sql = seriesSql(population, new URLSearchParams({ geography_name: "Polska|Czechia" }));
    expect(sql).toContain("geography_name IN ('Polska', 'Czechia')");
    expect(sql).toContain("FROM gold.metrics_population");
    expect(sql).toContain("LIMIT 20000");
  });

  it("selects the filter columns for members", () => {
    expect(membersSql(population)).toBe(
      "SELECT DISTINCT source_system, geography_level, frequency, geography_name, definition FROM gold.metrics_population LIMIT 20000",
    );
  });

  it("reads the measure catalogue of the namespace", () => {
    expect(catalogSql("gold")).toContain("FROM gold.dim_measure");
  });
});

describe("route", () => {
  it("throws 404 for an unknown metric", async () => {
    await expect(route(["metrics", "nope", "series"], new URLSearchParams(), noSql)).rejects.toMatchObject({ status: 404 });
  });

  it("returns the manifest without SQL", async () => {
    await expect(route(["manifest"], new URLSearchParams(), noSql)).resolves.toMatchObject({ namespace: "gold" });
  });

  it("groups member values from the distinct rows", async () => {
    const run = async () => [
      { geography_name: "Polska", frequency: "A" },
      { geography_name: "Czechia", frequency: "A" },
    ];
    const result = (await route(["metrics", "population", "members"], new URLSearchParams(), run)) as {
      values: Record<string, string[]>;
    };
    expect(result.values.geography_name).toEqual(["Czechia", "Polska"]);
    expect(result.values.frequency).toEqual(["A"]);
  });
});

const column = population.dimensions[0]!.column;
const filter = (value: string) => new URLSearchParams({ [column]: value });
const whereCount = (sql: string) => sql.split("WHERE").length - 1;

describe("injection", () => {
  it("rejects a value with '=' (outside SAFE_VALUE)", () => {
    expect(() => seriesSql(population, filter("x' OR '1'='1"))).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("doubles the quotes of an injection attempt", () => {
    const sql = seriesSql(population, filter("x' OR '1'"));
    expect(sql).toContain("'x'' OR ''1'''");
    expect(whereCount(sql)).toBe(1);
  });

  for (const [name, value] of [
    ["a backslash", "x\\"],
    ["a newline", "x\ny"],
    ["a backtick", "x`y"],
    ["an asterisk", "x*"],
  ]) {
    it(`answers 400 for a value with ${name}`, () => {
      expect(() => seriesSql(population, filter(value!))).toThrow(expect.objectContaining({ status: 400 }));
    });
  }

  it("splits 'a|b' into an IN list", () => {
    expect(seriesSql(population, filter("a|b"))).toContain(`${column} IN ('a', 'b')`);
  });
});

describe("columns", () => {
  for (const name of ["evil", "table"]) {
    it(`ignores the non-dimension parameter '${name}'`, () => {
      const sql = seriesSql(population, new URLSearchParams({ [name]: "evil" }));
      expect(whereCount(sql)).toBe(0);
      expect(sql).not.toContain("evil");
    });
  }
});

describe("route params", () => {
  for (const path of [
    ["metrics", "nope", "series"],
    ["metrics"],
    ["metrics", "population"],
    ["metrics", "population", "series", "x"],
    ["..", "manifest"],
    [],
  ]) {
    it(`answers 404 for /${path.join("/")}`, async () => {
      await expect(route(path, new URLSearchParams(), noSql)).rejects.toMatchObject({ status: 404 });
    });
  }

  it("answers 404 for a quoted metric name without running SQL", async () => {
    let calls = 0;
    const run = async () => {
      calls += 1;
      return [];
    };
    await expect(route(["metrics", "population' --", "series"], new URLSearchParams(), run)).rejects.toMatchObject({ status: 404 });
    expect(calls).toBe(0);
  });
});
