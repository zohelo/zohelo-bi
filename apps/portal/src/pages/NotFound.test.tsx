import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotFound } from "./NotFound";

describe("NotFound", () => {
  it("names the path and links home and to the catalogue", () => {
    const html = renderToStaticMarkup(<NotFound path="/kpi/x" />);
    expect(html).toContain("Page not found");
    expect(html).toContain("<code>/kpi/x</code>");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/catalogue"');
  });
});
