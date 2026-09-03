import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { previewOrigin } from "./preview-port.mjs";

process.env.PREVIEW_PORT ??= "0";
const { server } = await import("./serve-site.mjs");

await new Promise((resolve) => server.listening ? resolve() : server.once("listening", resolve));
const origin = previewOrigin(server.address());
const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
const child = spawn(process.execPath, [cli, "test"], {
  stdio: "inherit",
  env: { ...process.env, PREVIEW_ORIGIN: origin, PREVIEW_SERVER_MANAGED: "1" },
});

const shutdown = (code = 1) => {
  server.closeAllConnections?.();
  server.close(() => process.exit(code));
  setTimeout(() => process.exit(code), 1000).unref();
};
child.on("error", () => shutdown(1));
child.on("exit", (code, signal) => shutdown(typeof code === "number" ? code : signal ? 1 : 0));
