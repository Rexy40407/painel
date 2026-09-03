import assert from "node:assert/strict";
import test from "node:test";

import { previewOrigin, resolvePreviewPort } from "./preview-port.mjs";

test("preview server uses an ephemeral port when no override is supplied", () => {
  assert.equal(resolvePreviewPort({}), 0);
});

test("preview server accepts an explicit valid port", () => {
  assert.equal(resolvePreviewPort({ PREVIEW_PORT: "4317" }), 4317);
  assert.equal(resolvePreviewPort({ PORT: "4318" }), 4318);
});

test("preview server rejects invalid ports instead of silently reusing a fixed port", () => {
  assert.throws(() => resolvePreviewPort({ PREVIEW_PORT: "nope" }), /valid TCP port/i);
  assert.throws(() => resolvePreviewPort({ PREVIEW_PORT: "70000" }), /valid TCP port/i);
});

test("preview origin is derived from the port actually assigned by the OS", () => {
  assert.equal(previewOrigin({ address: "127.0.0.1", family: "IPv4", port: 49821 }), "http://127.0.0.1:49821");
  assert.throws(() => previewOrigin(null), /listening TCP server/i);
});
