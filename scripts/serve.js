// Tiny zero-dependency static server for the playground: `npm run playground`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".bhoj": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }

  if (pathname === "/") {
    res.writeHead(302, { Location: "/playground/" }).end();
    return;
  }
  if (pathname.endsWith("/")) pathname += "index.html";

  const file = resolve(root, "." + pathname);
  if (!file.startsWith(root + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Na mil paail (404)");
  }
}).listen(port, () => {
  console.log(`Playground chal rahal ba: http://localhost:${port}/`);
});
