import assert from 'node:assert/strict';
import test from 'node:test';

const workerUrl = new URL('../dist/server/index.js', import.meta.url);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };

test('built Worker protects APIs and serves the sign-in surface on direct links', async () => {
  const unauthorized = await worker.fetch(new Request('https://cogmetrics.test/api/workspace'), env, context);
  assert.equal(unauthorized.status, 401);
  for (const path of ['/', '/pacientes/example', '/relatorios/example']) {
    const response = await worker.fetch(new Request('https://cogmetrics.test' + path, { headers: { accept: 'text/html' } }), env, context);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    const html = await response.text();
    assert.match(html, /CogMetrics/);
    assert.match(html, /Entrar com ChatGPT/);
    assert.doesNotMatch(html, /Maria Oliveira|Rafael Lima|codex-preview/);
  }
});
test('authenticated HTML bootstraps the workspace without embedding clinical records', async () => {
  const response = await worker.fetch(new Request('https://cogmetrics.test/avaliacoes', { headers: {
    accept: 'text/html', 'oai-authenticated-user-id': 'render-test', 'oai-authenticated-user-email': 'render@example.test',
  } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Carregando seus registros demonstrativos/);
  assert.doesNotMatch(html, /Maria Oliveira|Entrar com ChatGPT/);
});
