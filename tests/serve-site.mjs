import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { previewOrigin, resolvePreviewPort } from "./preview-port.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = resolvePreviewPort(process.env);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    const relative = pathname.replace(/^\/+/, "") || "site/index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !existsSync(file)) { response.writeHead(404); response.end("Not found"); return; }
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch (error) {
    response.writeHead(500);
    response.end(String(error));
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Preview harness listening on ${previewOrigin(server.address())}`));
const shutdown = () => {
  server.closeAllConnections?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { server };
