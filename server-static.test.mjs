import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { test } from 'node:test';

test('static responses cache versioned assets and revalidate mutable files', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'idol-static-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await copyFile(new URL('./server.mjs', import.meta.url), path.join(root, 'server.mjs'));
  const fixtures = {
    'index.html': '<main>Home</main>',
    'admin/index.html': '<main>Admin</main>',
    'assets/index-BdXpwnM6.js': 'console.log("versioned")',
    'assets/index-DUEJV2kl.css': 'body{margin:0}',
    'admin/admin.js': 'console.log("mutable")',
    'photos/hero.jpg': 'image bytes',
    'photos/optimized/hero-012345abcdef.webp': 'optimized image bytes',
  };
  for (const [name, contents] of Object.entries(fixtures)) {
    const destination = path.join(root, 'public', name);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const server = spawn(process.execPath, [path.join(root, 'server.mjs')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (server.exitCode === null) {
      server.kill();
      await once(server, 'exit');
    }
  });
  await once(server.stdout, 'data');
  const get = (url, options) => fetch(`http://127.0.0.1:${port}${url}`, options);

  await t.test('Vite filenames and versioned WebP files receive immutable caching', async () => {
    for (const url of ['/assets/index-BdXpwnM6.js', '/assets/index-DUEJV2kl.css', '/photos/optimized/hero-012345abcdef.webp']) {
      const response = await get(url);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
      await response.arrayBuffer();
    }
  });
  await t.test('HTML and unversioned admin scripts are revalidated', async () => {
    for (const url of ['/', '/booking', '/admin', '/admin/admin.js']) {
      const response = await get(url);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      await response.arrayBuffer();
    }
  });
  await t.test('image validators return 304 and changed content returns a new body', async () => {
    const original = await get('/photos/hero.jpg');
    const etag = original.headers.get('etag');
    const modified = original.headers.get('last-modified');
    assert.equal(original.headers.get('cache-control'), 'public, max-age=3600');
    await original.arrayBuffer();
    const cached = await get('/photos/hero.jpg', { headers: { 'If-None-Match': etag } });
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), '');
    assert.equal((await get('/photos/hero.jpg', { headers: { 'If-Modified-Since': modified } })).status, 304);
    const unmatched = await get('/photos/hero.jpg', { headers: { 'If-None-Match': '"different"', 'If-Modified-Since': modified } });
    assert.equal(unmatched.status, 200);
    await unmatched.arrayBuffer();
    await writeFile(path.join(root, 'public/photos/hero.jpg'), 'updated image with different bytes');
    const changed = await get('/photos/hero.jpg', { headers: { 'If-None-Match': etag } });
    assert.equal(changed.status, 200);
    assert.notEqual(changed.headers.get('etag'), etag);
    assert.equal(await changed.text(), 'updated image with different bytes');
  });
  await t.test('HEAD returns metadata without downloading an image', async () => {
    const response = await get('/photos/optimized/hero-012345abcdef.webp', { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-length'), String(Buffer.byteLength(fixtures['photos/optimized/hero-012345abcdef.webp'])));
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.equal(await response.text(), '');
  });
});
