import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'site-dist');

before(() => {
  assert.ok(output.startsWith(resolve(root) + sep), 'Build output must stay inside this checkout');
  execFileSync(process.execPath, ['tools/minify-site.mjs'], {cwd: root, stdio: 'pipe'});
});

test('retired GitHub Pages Vozen dashboard is absent from the published artifact', async () => {
  await assert.rejects(access(resolve(output, 'vozen.html')), {code: 'ENOENT'});
  // Preserve the source/history and the independent VPS deployment.
  await access(resolve(root, 'site/vozen.html'));
});

test('retiring one dashboard preserves other public pages and shared resources', async () => {
  for (const file of ['index.html', 'privacidade.html', 'helper.html', 'favicon.svg', 'panel-clarity.css']) {
    await access(resolve(output, file));
  }
  assert.equal(await readFile(resolve(output, 'privacidade.html'), 'utf8'),
    await readFile(resolve(root, 'site/privacidade.html'), 'utf8'));
});
