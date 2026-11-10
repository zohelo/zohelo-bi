import { parse } from "yaml";
import type { Plugin } from "vite";

// `import x from "….yaml"` gives the parsed document (as JSON in the bundle): the dashboards and yardsticks are
// parsed at build time, so the browser loads neither the YAML parser nor the comments. A syntax error fails the
// build with the file name. Used by vite.config.ts and the root vitest.config.ts.
export function yamlData(): Plugin {
  return {
    name: "zohelo-yaml-data",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0]!;
      if (!file.endsWith(".yaml") || id.includes("?raw")) return null;
      let doc: unknown;
      try {
        doc = parse(code);
      } catch (e) {
        this.error(`${file}: błąd składni YAML / YAML syntax error: ${e instanceof Error ? e.message : String(e)}`);
      }
      return { code: `export default ${JSON.stringify(doc)};`, map: null };
    },
  };
}
