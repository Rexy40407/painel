export function resolvePreviewPort(env = process.env) {
  const raw = env.PREVIEW_PORT ?? env.PORT ?? "0";
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`PREVIEW_PORT must be a valid TCP port, received ${JSON.stringify(raw)}`);
  }
  return port;
}

export function previewOrigin(address) {
  if (!address || typeof address === "string" || !Number.isInteger(address.port)) {
    throw new Error("Preview origin requires a listening TCP server");
  }
  return `http://127.0.0.1:${address.port}`;
}
