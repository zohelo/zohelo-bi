import { afterEach, describe, expect, it, vi } from "vitest";
import { loadManifest, lookupMetric, type PublishedEnv } from "./published";
import { route } from "./query";
import manifestFixture from "../../../packages/semantic/fixtures/v1/manifest.json";

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
