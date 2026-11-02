import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotFound } from "./NotFound";

describe("NotFound", () => {
  it("names the path and links home and to the catalogue", () => {
    const html = renderToStaticMarkup(<NotFound path="/kpi/x" lang="en" />);
    expect(html).toContain("Page not found");
    expect(html).toContain("<code>/kpi/x</code>");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/catalogue"');
  });

  it("is Polish with lang pl", () => {
    const html = renderToStaticMarkup(<NotFound path="/kpi/x" lang="pl" />);
    expect(html).toContain("Nie znaleziono strony");
    expect(html).toContain("<code>/kpi/x</code>");
  });
});
