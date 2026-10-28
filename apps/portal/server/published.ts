// Reads the published layer (06_published/v1, written by zohelo-data) over the S3 API with the lakehouse
// read-only key pair (decision D7: no R2 binding). Until zohelo-data publishes, manifest.json is missing
// and the API falls back to the hand-written manifest in @zohelo/semantic.

import { AwsClient } from "aws4fetch";
import {
  manifest as pocManifest,
  metric as pocMetric,
  validateManifest,
  type Manifest,
  type Metric,
  type PublishedManifest,
} from "@zohelo/semantic";

export type PublishedEnv = {
  STORAGE_LAKEHOUSE_BUCKET_NAME: string;
  STORAGE_ENDPOINT_URL?: string;
  STORAGE_LAKEHOUSE_READ_ACCESS_KEY?: string;
  STORAGE_LAKEHOUSE_READ_SECRET_KEY?: string;
  PUBLISHED_PREFIX?: string;
};

export type LoadedManifest = { origin: "published"; manifest: PublishedManifest } | { origin: "poc"; manifest: Manifest };

export const POC: LoadedManifest = { origin: "poc", manifest: pocManifest };

/** GET <STORAGE_ENDPOINT_URL>/<bucket>/<key>, signed with the read key; null when the object does not exist. */
export async function getObject(env: PublishedEnv, key: string): Promise<string | null> {
  const {
    STORAGE_ENDPOINT_URL: endpoint,
    STORAGE_LAKEHOUSE_READ_ACCESS_KEY: accessKeyId,
    STORAGE_LAKEHOUSE_READ_SECRET_KEY: secretAccessKey,
  } = env;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("missing env STORAGE_ENDPOINT_URL or the lakehouse read key");
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const response = await client.fetch(`${endpoint.replace(/\/+$/, "")}/${env.STORAGE_LAKEHOUSE_BUCKET_NAME}/${key}`, { method: "GET" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GET ${key}: HTTP ${response.status}`);
  return response.text();
}

/** The published manifest when PUBLISHED_PREFIX is set and <prefix>/manifest.json exists and validates, else the hand-written one. */
export async function loadManifest(env: PublishedEnv): Promise<LoadedManifest> {
  if (!env.PUBLISHED_PREFIX) {
    console.error("published manifest: PUBLISHED_PREFIX not set; using the hand-written manifest");
    return POC;
  }
  const key = `${env.PUBLISHED_PREFIX.replace(/\/+$/, "")}/manifest.json`;
  try {
    const text = await getObject(env, key);
    if (text === null) {
      console.error(`published manifest: ${key} not found; using the hand-written manifest`);
      return POC;
    }
    return { origin: "published", manifest: validateManifest(JSON.parse(text)) };
  } catch (error) {
    console.error(`published manifest: ${error instanceof Error ? error.message : String(error)}; using the hand-written manifest`);
    return POC;
  }
}

/**
 * The metric the API queries for `id`. With the published manifest, the metric must be listed there (by
 * kpi_key) and its table comes from it; labels, filter dimensions and defaults stay those of the hand-written
 * manifest until the switch Deliverable replaces it.
 */
export function lookupMetric(loaded: LoadedManifest, id: string): Metric | undefined {
  const base = pocMetric(id);
  if (loaded.origin === "poc" || !base) return base;
  const published = loaded.manifest.metrics.find((m) => m.kpi_key === id);
  return published ? { ...base, table: published.table } : undefined;
}
