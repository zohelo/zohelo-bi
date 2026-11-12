// A JSON Schema reader for exactly the keywords zohelo-data's published schemas use (warehouse/published/schemas/v2,
// copied byte for byte into packages/semantic/schemas/v2): type, required, properties, additionalProperties, items,
// enum, pattern and minItems. Decision D24: bi validates exactly what the schema declares, so the validators read
// the copied schema instead of restating it. A keyword outside that set fails loudly (`unsupported keyword`), so a
// new schema feature cannot be skipped silently: extend this file when zohelo-data starts using one.

export type JsonSchema = {
  type?: SchemaType | SchemaType[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  enum?: unknown[];
  pattern?: string;
  minItems?: number;
  [annotation: string]: unknown;
};

type SchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";

const KEYWORDS = new Set(["type", "required", "properties", "additionalProperties", "items", "enum", "pattern", "minItems"]);
const ANNOTATIONS = new Set(["$schema", "$id", "title", "description"]);

const patterns = new Map<string, RegExp>();
const regex = (p: string): RegExp => {
  let r = patterns.get(p);
  if (!r) patterns.set(p, (r = new RegExp(p, "u")));
  return r;
};

function typeOf(x: unknown): SchemaType {
  if (x === null) return "null";
  if (Array.isArray(x)) return "array";
  if (typeof x === "number") return Number.isInteger(x) ? "integer" : "number";
  return typeof x as SchemaType;
}

const fits = (actual: SchemaType, expected: SchemaType) => actual === expected || (expected === "number" && actual === "integer");

/** Throws `<file>: <json path>: <problem>` at the first place where `x` breaks `schema`. */
export function checkSchema(file: string, x: unknown, schema: JsonSchema, path = "$"): void {
  for (const key of Object.keys(schema))
    if (!KEYWORDS.has(key) && !ANNOTATIONS.has(key)) throw new Error(`${file}: schema at ${path}: unsupported keyword ${key}`);
  const actual = typeOf(x);
  if (schema.type !== undefined) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((t) => fits(actual, t))) throw new Error(`${file}: ${path}: expected ${expected.join(" or ")}, got ${actual}`);
  }
  if (schema.enum && !schema.enum.includes(x))
    throw new Error(`${file}: ${path}: expected one of ${schema.enum.map(String).join(", ")}, got ${String(x)}`);
  if (actual === "string" && schema.pattern !== undefined && !regex(schema.pattern).test(x as string))
    throw new Error(`${file}: ${path}: "${String(x)}" does not match ${schema.pattern}`);
  if (actual === "array") {
    const items = x as unknown[];
    if (schema.minItems !== undefined && items.length < schema.minItems)
      throw new Error(`${file}: ${path}: expected at least ${schema.minItems} items, got ${items.length}`);
    if (schema.items) items.forEach((item, i) => checkSchema(file, item, schema.items!, `${path}[${i}]`));
  }
  if (actual === "object") {
    const o = x as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!(key in o)) throw new Error(`${file}: ${path}.${key}: required property missing`);
    const props = schema.properties ?? {};
    for (const [key, value] of Object.entries(o)) {
      const sub = props[key];
      if (sub) checkSchema(file, value, sub, `${path}.${key}`);
      else if (schema.additionalProperties === false) throw new Error(`${file}: ${path}.${key}: property not allowed`);
      else if (typeof schema.additionalProperties === "object") checkSchema(file, value, schema.additionalProperties, `${path}.${key}`);
    }
  }
}
