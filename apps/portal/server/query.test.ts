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
    expect(sql).toContain("FROM poc.metrics_population");
    expect(sql).toContain("LIMIT 20000");
  });

  it("selects the filter columns for members", () => {
    expect(membersSql(population)).toBe(
      "SELECT DISTINCT source_system, geography_level, frequency, geography_name, definition FROM poc.metrics_population LIMIT 20000",
    );
  });

  it("reads the measure catalogue of the namespace", () => {
    expect(catalogSql("poc")).toContain("FROM poc.dim_measure");
  });
});

describe("route", () => {
  it("throws 404 for an unknown metric", async () => {
    await expect(route(["metrics", "nope", "series"], new URLSearchParams(), noSql)).rejects.toMatchObject({ status: 404 });
  });

  it("returns the manifest without SQL", async () => {
    await expect(route(["manifest"], new URLSearchParams(), noSql)).resolves.toMatchObject({ namespace: "poc" });
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
