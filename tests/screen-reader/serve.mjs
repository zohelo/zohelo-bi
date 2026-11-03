/* global URL, console */
// Tiny static server for the design mockups, so the screen-reader runs need no secrets
// and no access to the Cloudflare-protected preview.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = normalize(join(import.meta.dirname, "../../apps/portal/public"));
// The built template portal (VITE_DATA_MODE=dummy bun run build): every path outside /mockups/ is the SPA.
const dist = normalize(join(import.meta.dirname, "../../apps/portal/dist"));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const base = pathname.startsWith("/mockups/") ? root : dist;
  let path = normalize(join(base, pathname));
  if (!path.startsWith(base)) return res.writeHead(403).end();
  if (base === dist && !extname(path)) path = join(dist, "index.html");
  try {
    const body = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(4174, () => console.log("serving mockups on http://localhost:4174"));
