// Checks zohelo.theme.json against Microsoft's report theme schema (pinned version below), more strictly than
// the schema itself: the schema lets any property name through `visualStyles`, so every card and property is
// looked up in the definition of each visual it applies to, and enum, type and colour values are checked there.
// Usage (repository root, needs network): node packages/design-template/powerbi/check.mjs
import console from "node:console";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCHEMA =
  "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json";
const here = dirname(fileURLToPath(import.meta.url));
const theme = JSON.parse(readFileSync(join(here, "zohelo.theme.json"), "utf8"));
const schema = await (await globalThis.fetch(SCHEMA)).json();
const defs = schema.definitions;
const visuals = schema.properties.visualStyles.properties;

const resolve = (node) => {
  while (node && node.$ref) node = defs[node.$ref.split("/").pop()];
  return node ?? {};
};
// card name -> { property name -> property schema } of one visual definition (allOf and $ref merged)
function cardsOf(node, out = {}) {
  node = resolve(node);
  for (const part of node.allOf ?? []) cardsOf(part, out);
  for (const [card, spec] of Object.entries(node.properties ?? {})) {
    const items = resolve(resolve(spec).items);
    const props = { ...(items.properties ?? {}) };
    for (const part of items.allOf ?? []) Object.assign(props, resolve(part).properties ?? {});
    out[card] = { ...(out[card] ?? {}), ...props };
  }
  return out;
}
const perVisual = Object.fromEntries(Object.entries(visuals).map(([name, v]) => [name, cardsOf(v.properties?.["*"] ?? {})]));

const problems = [];
function checkValue(where, value, spec) {
  spec = resolve(spec);
  const options = [...(spec.oneOf ?? []), ...(spec.anyOf ?? [])].map(resolve);
  const consts = options.filter((o) => "const" in o).map((o) => o.const);
  if (consts.length && options.every((o) => "const" in o) && !consts.includes(value))
    problems.push(`${where}: ${JSON.stringify(value)} is not one of ${consts.join(", ")}`);
  if (Array.isArray(spec.enum) && !spec.enum.includes(value)) problems.push(`${where}: ${value} not in enum`);
  const kinds = { number: "number", integer: "number", boolean: "boolean", string: "string" };
  if (kinds[spec.type] && typeof value !== kinds[spec.type]) problems.push(`${where}: expected ${spec.type}, got ${typeof value}`);
  if (value && typeof value === "object" && value.solid && !/^#[0-9A-F]{6}$/i.test(value.solid.color))
    problems.push(`${where}: colour ${value.solid.color} is not #RRGGBB`);
}
function checkCards(visual, cards, applyTo) {
  for (const [card, entries] of Object.entries(cards)) {
    for (const [prop, value] of Object.entries(entries[0])) {
      const where = `${visual}.${card}.${prop}`;
      const holders = applyTo.filter((v) => perVisual[v][card]?.[prop]);
      if (!holders.length) problems.push(`${where}: no visual defines it`);
      for (const v of holders) checkValue(`${where} (${v})`, value, perVisual[v][card][prop]);
    }
  }
}
for (const [visual, presets] of Object.entries(theme.visualStyles)) {
  if (visual !== "*" && !visuals[visual]) problems.push(`${visual}: not a visual`);
  checkCards(visual, presets["*"], visual === "*" ? Object.keys(perVisual) : [visual]);
}
for (const key of Object.keys(theme)) if (!schema.properties[key]) problems.push(`${key}: not a theme property`);
for (const [name, cls] of Object.entries(theme.textClasses))
  for (const key of Object.keys(cls)) if (!resolve(defs.textClass).properties?.[key]) problems.push(`textClasses.${name}.${key}: unknown`);

console.log(problems.length ? problems.join("\n") : "zohelo.theme.json: ok");
process.exit(problems.length ? 1 : 0);
