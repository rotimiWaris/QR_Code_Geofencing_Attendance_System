import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build, transform } from 'esbuild';

// Render the real table component: an empty result must retain the input.
const tableBuild = await build({
  stdin: {
    contents: "import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {DataTable} from './src/components/common/DataTable'; module.exports = renderToStaticMarkup(React.createElement(DataTable,{columns:[{key:'name',header:'Name'}],data:[],keyExtractor:r=>r.id,searchable:true,searchPlaceholder:'Search venues...',emptyTitle:'No matches'}));",
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  tsconfig: 'tsconfig.json',
});
const tableModule = { exports: {} };
vm.runInNewContext(tableBuild.outputFiles[0].text, {
  module: tableModule, exports: tableModule.exports,
  require: createRequire(new URL('../package.json', import.meta.url)), console,
});
assert.match(tableModule.exports, /<input/);
assert.match(tableModule.exports, /Search venues/);
assert.match(tableModule.exports, /No matches/);

// Exercise the real interceptor with a deterministic Axios transport.
const source = (await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8'))
  .replace(/^import axios[^\n]*\n/m, '')
  .replace('import.meta.env.VITE_API_BASE_URL', 'undefined');
const compiled = (await transform(source, { loader: 'ts', format: 'esm' })).code
  .replace(/export\s*\{[^}]*\};?\s*$/, 'globalThis.apiClient = apiClient;');

function harness(refreshOutcome = 'success', requestStatus = 401) {
  const storage = new Map([['auth_token', 'expired'], ['refresh_token', 'valid-refresh'], ['user', '{}']]);
  let refreshCalls = 0;
  let expiredEvents = 0;
  let requestInterceptor;
  let responseError;
  const makeError = (status, config) => Object.assign(new Error('Request failed'), {
    isAxiosError: true, response: status ? { status, data: {} } : undefined, config,
  });
  const client = {
    interceptors: {
      request: { use: handler => { requestInterceptor = handler; } },
      response: { use: (_success, handler) => { responseError = handler; } },
    },
    async request(config) {
      config = requestInterceptor({ ...config, headers: { ...config.headers } });
      if (config.headers.Authorization === 'Bearer fresh' && !config.url.includes('/auth/login/')) return { data: { ok: true } };
      return responseError(makeError(requestStatus, config));
    },
    get(url, config) { return this.request({ ...config, url }); },
  };
  const axios = {
    create: () => client,
    isAxiosError: error => error?.isAxiosError === true,
    async post() {
      refreshCalls++;
      await new Promise(resolve => setTimeout(resolve, 5));
      if (refreshOutcome === 'invalid') throw makeError(401);
      if (refreshOutcome === 'network') throw makeError();
      return { data: { access: 'fresh', refresh: 'rotated' } };
    },
  };
  const context = {
    axios, navigator: {}, console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    window: { dispatchEvent: () => { expiredEvents++; } },
    Event: class { constructor(type) { this.type = type; } },
  };
  vm.runInNewContext(compiled, context);
  return { api: context.apiClient, storage, stats: () => ({ refreshCalls, expiredEvents }) };
}
const valid = harness();
const results = await Promise.all(Array.from({ length: 12 }, () => valid.api.get('/courses/')));
assert.ok(results.every(result => result.ok));
assert.equal(valid.stats().refreshCalls, 1);
assert.equal(valid.storage.get('refresh_token'), 'rotated');
assert.equal(valid.stats().expiredEvents, 0);

const invalid = harness('invalid');
await assert.rejects(invalid.api.get('/courses/'));
assert.equal(invalid.storage.has('auth_token'), false);
assert.equal(invalid.storage.has('refresh_token'), false);
assert.equal(invalid.stats().expiredEvents, 1);

const offline = harness('network');
await assert.rejects(offline.api.get('/courses/'));
assert.equal(offline.storage.get('refresh_token'), 'valid-refresh');
assert.equal(offline.stats().expiredEvents, 0);

const login = harness();
await assert.rejects(login.api.get('/auth/login/'));
assert.equal(login.stats().refreshCalls, 0);
console.log('Passed: empty-table search, concurrent refresh, refresh rotation, invalid-session clearing, network persistence, public-auth exclusion.');
