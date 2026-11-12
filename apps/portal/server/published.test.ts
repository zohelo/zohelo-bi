import { afterEach, describe, expect, it, vi } from "vitest";
import { loadManifest, lookupMetric, publishedReader, type PublishedEnv } from "./published";
import { HttpError, route } from "./query";
import manifestFixture from "../../../packages/semantic/fixtures/v1/manifest.json";
import catalogFixture from "../../../packages/semantic/fixtures/v1/catalog/catalog.json";
import latestFixture from "../../../packages/semantic/fixtures/v1/kpi/unemployment_rate/latest.json";
import catalogV2 from "../../../packages/semantic/fixtures/v2/catalog.json";
import latestV2 from "../../../packages/semantic/fixtures/v2/latest.json";
import seriesV2 from "../../../packages/semantic/fixtures/v2/kpi/unemployment_lfs/series.json";
import calendarV2 from "../../../packages/semantic/fixtures/v2/calendar.json";
import topicsV2 from "../../../packages/semantic/fixtures/v2/topics.json";

const fixture = JSON.stringify(manifestFixture);

const env: PublishedEnv = {
  STORAGE_LAKEHOUSE_BUCKET_NAME: "lakehouse",
  STORAGE_ENDPOINT_URL: "https://account.r2.cloudflarestorage.com",
  STORAGE_LAKEHOUSE_READ_ACCESS_KEY: "test-access-key",
  STORAGE_LAKEHOUSE_READ_SECRET_KEY: "test-secret-key",
  PUBLISHED_PREFIX: "06_published/v1",
};

function stubFetch(status: number, body: string) {
  const fetch = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const noSql = async () => {
  throw new Error("no SQL expected");
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadManifest", () => {
  it("serves a valid published manifest, read with a signed GET", async () => {
    const fetch = stubFetch(200, fixture);
    const loaded = await loadManifest(env);
    expect(loaded.origin).toBe("published");
    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("https://account.r2.cloudflarestorage.com/lakehouse/06_published/v1/manifest.json");
    expect(request.headers.get("Authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=test-access-key\//);
    expect(await route(["manifest"], new URLSearchParams(), noSql, loaded)).toEqual(JSON.parse(fixture));
  });

  it("falls back to the hand-written manifest on 404", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(404, "<Error><Code>NoSuchKey</Code></Error>");
    expect((await loadManifest(env)).origin).toBe("poc");
  });

  it("falls back on invalid JSON", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(200, "{not json");
    expect((await loadManifest(env)).origin).toBe("poc");
    expect(error).toHaveBeenCalled();
  });

  it("falls back on a manifest that does not validate", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(200, JSON.stringify({ version: 1, metrics: [] }));
    expect((await loadManifest(env)).origin).toBe("poc");
  });

  it("falls back without PUBLISHED_PREFIX and does not fetch", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = stubFetch(200, fixture);
    expect((await loadManifest({ ...env, PUBLISHED_PREFIX: undefined })).origin).toBe("poc");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("lookupMetric", () => {
  it("takes the table from the published manifest and answers only for published kpi_keys", async () => {
    stubFetch(200, fixture.replace('"gold.metrics_population"', '"gold.metrics_population_v2"'));
    const loaded = await loadManifest(env);
    expect(lookupMetric(loaded, "population")?.table).toBe("gold.metrics_population_v2");
    if (loaded.origin === "published") loaded.manifest.metrics = loaded.manifest.metrics.filter((m) => m.kpi_key !== "fx_rate");
    expect(lookupMetric(loaded, "fx_rate")).toBeUndefined();
  });
});

describe("published files", () => {
  const params = new URLSearchParams();

  async function rejected(promise: Promise<unknown>): Promise<HttpError> {
    const error = await promise.then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(HttpError);
    return error as HttpError;
  }

  it("serves catalog.json, read with a signed GET", async () => {
    const fetch = stubFetch(200, JSON.stringify(catalogFixture));
    expect(await route(["published", "catalog"], params, noSql, undefined, publishedReader(env))).toEqual(catalogFixture);
    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("https://account.r2.cloudflarestorage.com/lakehouse/06_published/v1/catalog/catalog.json");
    expect(request.headers.get("Authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=test-access-key\//);
  });

  it("serves a KPI's latest.json", async () => {
    const fetch = stubFetch(200, JSON.stringify(latestFixture));
    const body = await route(["published", "kpi", "unemployment_rate", "latest"], params, noSql, undefined, publishedReader(env));
    expect(body).toEqual(latestFixture);
    expect((fetch.mock.calls[0]?.[0] as Request).url).toBe(
      "https://account.r2.cloudflarestorage.com/lakehouse/06_published/v1/kpi/unemployment_rate/latest.json",
    );
  });

  it("answers 404 when the file is not published", async () => {
    stubFetch(404, "<Error><Code>NoSuchKey</Code></Error>");
    const error = await rejected(route(["published", "kpi", "fx_rate", "latest"], params, noSql, undefined, publishedReader(env)));
    expect(error.status).toBe(404);
    expect(error.message).toBe("not published: kpi/fx_rate/latest.json");
  });

  it("answers 404 for a key that is not a kpi_key, without fetching", async () => {
    const fetch = stubFetch(200, JSON.stringify(latestFixture));
    const error = await rejected(route(["published", "kpi", "Bad-Key", "latest"], params, noSql, undefined, publishedReader(env)));
    expect(error.status).toBe(404);
    expect(error.message).toBe("unknown kpi: Bad-Key");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers 404 without PUBLISHED_PREFIX", async () => {
    const fetch = stubFetch(200, JSON.stringify(catalogFixture));
    const read = publishedReader({ ...env, PUBLISHED_PREFIX: undefined });
    expect(read).toBeUndefined();
    const error = await rejected(route(["published", "catalog"], params, noSql, undefined, read));
    expect(error.status).toBe(404);
    expect(error.message).toBe("published layer not configured");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("leaves /api/manifest and /api/catalog unchanged", async () => {
    const sql = vi.fn(async () => [{ measure_key: "population" }]);
    expect(await route(["catalog"], params, sql, undefined, publishedReader(env))).toEqual([{ measure_key: "population" }]);
    expect(sql).toHaveBeenCalledOnce();
    expect(await route(["manifest"], params, noSql, undefined, publishedReader(env))).toHaveProperty("metrics");
  });
});

describe("published topics (v2)", () => {
  const params = new URLSearchParams();
  const period = { window: { from: "2026-11-10", to: "2026-11-10" }, topics: [] };
  const topics = {
    version: 2,
    generated_at: "2026-11-10T05:30:00Z",
    periods: { day: period, week: period, month: period, quarter: period, year: period },
  };

  it("reads topics.json from the v2 prefix beside the v1 one", async () => {
    const fetch = stubFetch(200, JSON.stringify(topics));
    const body = await route(["published", "topics"], params, noSql, undefined, publishedReader(env), publishedReader(env, "v2"));
    expect(body).toEqual(topics);
    expect((fetch.mock.calls[0]?.[0] as Request).url).toBe(
      "https://account.r2.cloudflarestorage.com/lakehouse/06_published/v2/topics.json",
    );
  });

  it("answers 404 while topics are not switched on (file absent)", async () => {
    stubFetch(404, "<Error><Code>NoSuchKey</Code></Error>");
    const error = await route(["published", "topics"], params, noSql, undefined, undefined, publishedReader(env, "v2")).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
    expect((error as HttpError).message).toBe("not published: topics.json");
  });

  it("refuses a file that breaks the contract", async () => {
    stubFetch(200, JSON.stringify({ ...topics, periods: { day: period } }));
    await expect(route(["published", "topics"], params, noSql, undefined, undefined, publishedReader(env, "v2"))).rejects.toThrow(
      "topics.json: $.periods.week: required property missing",
    );
  });

  it("keeps a prefix that already names v2", async () => {
    const fetch = stubFetch(200, JSON.stringify(topics));
    await route(
      ["published", "topics"],
      params,
      noSql,
      undefined,
      undefined,
      publishedReader({ ...env, PUBLISHED_PREFIX: "06_published/v2" }, "v2"),
    );
    expect((fetch.mock.calls[0]?.[0] as Request).url).toBe(
      "https://account.r2.cloudflarestorage.com/lakehouse/06_published/v2/topics.json",
    );
  });
});

describe("published contract v2", () => {
  const params = new URLSearchParams();
  const v2 = (path: string[]) => route(path, params, noSql, undefined, publishedReader(env), publishedReader(env, "v2"));
  const url = (fetch: ReturnType<typeof stubFetch>) => (fetch.mock.calls[0]?.[0] as Request).url;
  const BASE = "https://account.r2.cloudflarestorage.com/lakehouse/06_published";

  it("serves catalog.json from the v2 prefix beside the v1 one, validated", async () => {
    const fetch = stubFetch(200, JSON.stringify(catalogV2));
    expect(await v2(["published", "v2", "catalog"])).toEqual(catalogV2);
    expect(url(fetch)).toBe(`${BASE}/v2/catalog.json`);
  });

  it("serves the one latest.json for all KPIs", async () => {
    const fetch = stubFetch(200, JSON.stringify(latestV2));
    expect(await v2(["published", "v2", "latest"])).toEqual(latestV2);
    expect(url(fetch)).toBe(`${BASE}/v2/latest.json`);
  });

  it("serves a KPI's series.json", async () => {
    const fetch = stubFetch(200, JSON.stringify(seriesV2));
    expect(await v2(["published", "v2", "kpi", "unemployment_lfs", "series"])).toEqual(seriesV2);
    expect(url(fetch)).toBe(`${BASE}/v2/kpi/unemployment_lfs/series.json`);
  });

  it("serves calendar.json", async () => {
    const fetch = stubFetch(200, JSON.stringify(calendarV2));
    expect(await v2(["published", "v2", "calendar"])).toEqual(calendarV2);
    expect(url(fetch)).toBe(`${BASE}/v2/calendar.json`);
  });

  it("answers 404 for a key that is not a kpi_key, without fetching", async () => {
    const fetch = stubFetch(200, JSON.stringify(seriesV2));
    await expect(v2(["published", "v2", "kpi", "../catalog", "series"])).rejects.toMatchObject({
      status: 404,
      message: "unknown kpi: ../catalog",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers 404 while a v2 file is not published", async () => {
    stubFetch(404, "<Error><Code>NoSuchKey</Code></Error>");
    await expect(v2(["published", "v2", "latest"])).rejects.toMatchObject({ status: 404, message: "not published: latest.json" });
  });

  it("refuses a series.json that breaks the contract", async () => {
    stubFetch(200, JSON.stringify({ ...seriesV2, periods: seriesV2.periods.slice(1) }));
    await expect(v2(["published", "v2", "kpi", "unemployment_lfs", "series"])).rejects.toThrow("one per period");
  });
});

describe("internal review copy of topics.json", () => {
  const params = new URLSearchParams();

  it("serves 06_published/v1/review/topics.json at the data portal's path, validated", async () => {
    const fetch = stubFetch(200, JSON.stringify(topicsV2));
    const body = await route(
      ["published", "v1", "review", "topics.json"],
      params,
      noSql,
      undefined,
      publishedReader(env),
      publishedReader(env, "v2"),
    );
    expect(body).toEqual(topicsV2);
    expect((fetch.mock.calls[0]?.[0] as Request).url).toBe(
      "https://account.r2.cloudflarestorage.com/lakehouse/06_published/v1/review/topics.json",
    );
  });

  it("reads the v1 prefix even when PUBLISHED_PREFIX names v2", async () => {
    const fetch = stubFetch(200, JSON.stringify(topicsV2));
    const read = publishedReader({ ...env, PUBLISHED_PREFIX: "06_published/v2" });
    await route(["published", "v1", "review", "topics.json"], params, noSql, undefined, read);
    expect((fetch.mock.calls[0]?.[0] as Request).url).toBe(
      "https://account.r2.cloudflarestorage.com/lakehouse/06_published/v1/review/topics.json",
    );
  });

  it("answers 404 when there is no review copy", async () => {
    stubFetch(404, "<Error><Code>NoSuchKey</Code></Error>");
    await expect(route(["published", "v1", "review", "topics.json"], params, noSql, undefined, publishedReader(env))).rejects.toMatchObject(
      { status: 404, message: "not published: review/topics.json" },
    );
  });
});
