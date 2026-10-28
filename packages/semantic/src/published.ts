// Types and validators for the published layer (06_published/v1), mirroring zohelo-data's JSON Schemas
// in warehouse/published/schemas/. The producer owns the field names: bi never adds or renames a field and
// validates exactly what the schemas declare (decision D24): required properties and JSON types, extra
// properties allowed.

export type CatalogKpiDimension = { dimension_key: string; member_count: number; levels: string[] };

export type CatalogKpi = {
  kpi_key: string;
  name_pl: string;
  name_en: string;
  unit_key: string;
  frequency_default: string;
  subgroup_key: string;
  domain_path: string[];
  source_keys: string[];
  geo_levels: string[];
  first_period: string;
  last_period: string;
  dimensions: CatalogKpiDimension[];
  loaded_at: string;
  status: string;
};

export type CatalogDomain = {
  domain_key: string;
  level: string;
  parent_key: string | null;
  name_en: string;
  name_pl: string;
  csa_code: string;
  sort: number;
};

export type CatalogUnit = { unit_key: string; symbol: string; name_en: string; name_pl: string; is_rate: boolean };

export type CatalogSource = {
  source_key: string;
  name_pl: string;
  name_en: string;
  licence_key: string;
  register_id: string;
};

export type CatalogLicence = {
  licence_key: string;
  name: string;
  url: string;
  attribution_text: string;
  commercial_ok: boolean;
};

export type PublishedCatalog = {
  version: number;
  generated_at: string;
  kpis: CatalogKpi[];
  domains: CatalogDomain[];
  units: CatalogUnit[];
  sources: CatalogSource[];
  licences: CatalogLicence[];
};

export type PublishedMetricDimension = { dimension_key: string; column: string };

export type PublishedMetric = {
  kpi_key: string;
  table: string;
  unit_key: string;
  frequency: string;
  time_column: string;
  value_column: string;
  source_column: string;
  dimensions: PublishedMetricDimension[];
  default_filters?: Record<string, unknown>;
};

export type PublishedManifest = { version: number; generated_at: string; metrics: PublishedMetric[] };

export type KpiLatestValue = {
  source_key: string;
  geography_key: string;
  geography_level: string;
  period: string;
  value: number;
  previous_period?: string;
  previous_value?: number;
  flags: string[];
  checked_at: string;
};

export type KpiLatest = { kpi_key: string; unit_key: string; generated_at: string; values: KpiLatestValue[] };

// --- schema mirror ---------------------------------------------------------------------------------------

type JsonType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";

type Spec = {
  type: JsonType | JsonType[];
  required?: readonly string[];
  properties?: Record<string, Spec>;
  items?: Spec;
};

const str: Spec = { type: "string" };
const int: Spec = { type: "integer" };
const num: Spec = { type: "number" };
const bool: Spec = { type: "boolean" };
const strings: Spec = { type: "array", items: str };

/** An object whose listed properties are all required, plus optional ones. */
function obj(required: Record<string, Spec>, optional: Record<string, Spec> = {}): Spec {
  return { type: "object", required: Object.keys(required), properties: { ...required, ...optional } };
}

const arrayOf = (items: Spec): Spec => ({ type: "array", items });

const catalogSpec = obj({
  version: int,
  generated_at: str,
  kpis: arrayOf(
    obj({
      kpi_key: str,
      name_pl: str,
      name_en: str,
      unit_key: str,
      frequency_default: str,
      subgroup_key: str,
      domain_path: strings,
      source_keys: strings,
      geo_levels: strings,
      first_period: str,
      last_period: str,
      dimensions: arrayOf(obj({ dimension_key: str, member_count: int, levels: strings })),
      loaded_at: str,
      status: str,
    }),
  ),
  domains: arrayOf(
    obj({
      domain_key: str,
      level: str,
      parent_key: { type: ["string", "null"] },
      name_en: str,
      name_pl: str,
      csa_code: str,
      sort: int,
    }),
  ),
  units: arrayOf(obj({ unit_key: str, symbol: str, name_en: str, name_pl: str, is_rate: bool })),
  sources: arrayOf(obj({ source_key: str, name_pl: str, name_en: str, licence_key: str, register_id: str })),
  licences: arrayOf(obj({ licence_key: str, name: str, url: str, attribution_text: str, commercial_ok: bool })),
});

const manifestSpec = obj({
  version: int,
  generated_at: str,
  metrics: arrayOf(
    obj(
      {
        kpi_key: str,
        table: str,
        unit_key: str,
        frequency: str,
        time_column: str,
        value_column: str,
        source_column: str,
        dimensions: arrayOf(obj({ dimension_key: str, column: str })),
      },
      { default_filters: { type: "object" } },
    ),
  ),
});

const kpiLatestSpec = obj({
  kpi_key: str,
  unit_key: str,
  generated_at: str,
  values: arrayOf(
    obj(
      {
        source_key: str,
        geography_key: str,
        geography_level: str,
        period: str,
        value: num,
        flags: strings,
        checked_at: str,
      },
      { previous_period: str, previous_value: num },
    ),
  ),
});

function jsonType(x: unknown): JsonType {
  if (x === null) return "null";
  if (Array.isArray(x)) return "array";
  if (typeof x === "number") return Number.isInteger(x) ? "integer" : "number";
  return typeof x as JsonType;
}

function matches(actual: JsonType, expected: JsonType): boolean {
  return actual === expected || (expected === "number" && actual === "integer");
}

function check(file: string, x: unknown, spec: Spec, path: string): void {
  const expected = Array.isArray(spec.type) ? spec.type : [spec.type];
  const actual = jsonType(x);
  if (!expected.some((t) => matches(actual, t))) {
    throw new Error(`${file}: ${path}: expected ${expected.join(" or ")}, got ${actual}`);
  }
  if (actual === "object") {
    const o = x as Record<string, unknown>;
    for (const key of spec.required ?? []) {
      if (!(key in o)) throw new Error(`${file}: ${path}.${key}: required property missing`);
    }
    for (const [key, sub] of Object.entries(spec.properties ?? {})) {
      if (key in o) check(file, o[key], sub, `${path}.${key}`);
    }
  } else if (actual === "array" && spec.items) {
    (x as unknown[]).forEach((item, i) => check(file, item, spec.items as Spec, `${path}[${i}]`));
  }
}

/** Validates 06_published/v1/catalog/catalog.json; throws Error('<file>: <json path>: <problem>'). */
export function validateCatalog(x: unknown): PublishedCatalog {
  check("catalog/catalog.json", x, catalogSpec, "$");
  return x as PublishedCatalog;
}

/** Validates 06_published/v1/manifest.json; throws Error('<file>: <json path>: <problem>'). */
export function validateManifest(x: unknown): PublishedManifest {
  check("manifest.json", x, manifestSpec, "$");
  return x as PublishedManifest;
}

/** Validates 06_published/v1/kpi/<kpi_key>/latest.json; throws Error('<file>: <json path>: <problem>'). */
export function validateKpiLatest(x: unknown): KpiLatest {
  check("kpi/<kpi_key>/latest.json", x, kpiLatestSpec, "$");
  return x as KpiLatest;
}
