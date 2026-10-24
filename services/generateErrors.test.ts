import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { FunctionsClient } from '@supabase/functions-js';
import { translations } from '../translations.ts';
import {
  CLIENT_GENERATE_TIMEOUT_MS,
  GENERATE_ERROR_CODES,
  GENERATE_ERROR_TRANSLATION_KEYS,
  GENERATE_MESSAGES,
  GenerateItineraryError,
  readInvokeFailure,
  resolveGenerateFailure,
  startClientAbort,
  visibleGenerateMessage,
} from './generateErrors.ts';

test('client generate budget matches the Edge 45s upstream timeout', () => {
  assert.equal(CLIENT_GENERATE_TIMEOUT_MS, 45_000);
});

test('maps Edge { code, error } bodies to fixed user-visible messages', async () => {
  const cases: Array<{ code: string; error: string }> = [
    { code: 'timeout', error: 'Itinerary generation timed out. Please try again or choose a shorter trip.' },
    { code: 'unauthorized', error: 'Invalid JWT' },
    { code: 'upstream_error', error: 'The travel planner could not complete this request. Please try again.' },
    { code: 'parse_error', error: 'The travel planner returned an unreadable itinerary. Please try again.' },
    { code: 'invalid_input', error: 'Enter a destination.' },
  ];

  for (const entry of cases) {
    const failure = await readInvokeFailure({
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify({ code: entry.code, error: entry.error }), {
        status: entry.code === 'unauthorized' ? 401 : 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
    const resolved = resolveGenerateFailure({ aborted: false, code: failure.code, detail: failure.detail });
    assert.equal(resolved.code, entry.code);
    assert.equal(resolved.message, GENERATE_MESSAGES[entry.code as keyof typeof GENERATE_MESSAGES]);
    assert.notEqual(resolved.message, 'Edge Function returned a non-2xx status code');
  }
});

test('maps a raw IDLE_TIMEOUT body and a JSON code', async () => {
  const raw = await readInvokeFailure({
    name: 'FunctionsHttpError',
    context: new Response('IDLE_TIMEOUT', { status: 504, headers: { 'Content-Type': 'text/plain' } }),
  });
  const rawResolved = resolveGenerateFailure({ aborted: false, code: raw.code, detail: raw.detail });
  assert.equal(rawResolved.code, 'IDLE_TIMEOUT');
  assert.equal(rawResolved.message, GENERATE_MESSAGES.IDLE_TIMEOUT);

  const json = await readInvokeFailure({
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify({ code: 'IDLE_TIMEOUT', error: 'IDLE_TIMEOUT' }), { status: 504 }),
  });
  const jsonResolved = resolveGenerateFailure({ aborted: false, code: json.code, detail: json.detail });
  assert.equal(jsonResolved.code, 'IDLE_TIMEOUT');
  assert.equal(jsonResolved.message, GENERATE_MESSAGES.IDLE_TIMEOUT);
});

test('maps HTTP 401 without a code to unauthorized', async () => {
  const failure = await readInvokeFailure({
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify({ message: 'Invalid JWT' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  });
  const resolved = resolveGenerateFailure({ aborted: false, code: failure.code, detail: failure.detail });
  assert.equal(resolved.code, 'unauthorized');
  assert.equal(resolved.message, GENERATE_MESSAGES.unauthorized);
});

test('reads a legacy context.body stream', async () => {
  const failure = await readInvokeFailure({
    context: {
      body: new Blob([JSON.stringify({ code: 'invalid_input', error: 'Enter a destination.' })]).stream(),
    },
  });
  assert.equal(failure.code, 'invalid_input');
  const resolved = resolveGenerateFailure({ aborted: false, code: failure.code, detail: failure.detail });
  assert.equal(resolved.message, GENERATE_MESSAGES.invalid_input);
});

test('a client abort wins over a transport error', () => {
  const resolved = resolveGenerateFailure({
    aborted: true,
    code: 'upstream_error',
    detail: 'Failed to send a request to the Edge Function',
  });
  assert.equal(resolved.code, 'timeout');
  assert.equal(resolved.message, GENERATE_MESSAGES.timeout);
});

test('Home can translate every mapped code', () => {
  const err = new GenerateItineraryError('parse_error', GENERATE_MESSAGES.parse_error);
  for (const locale of ['en', 'zh-TW', 'zh-CN'] as const) {
    const copy = translations[locale] as Record<string, string>;
    for (const code of GENERATE_ERROR_CODES) {
      const key = GENERATE_ERROR_TRANSLATION_KEYS[code];
      assert.equal(typeof copy[key], 'string');
      assert.ok(copy[key].length > 0);
    }
    const message = visibleGenerateMessage(err, (key) => copy[key]);
    assert.equal(message, copy.generate_error_parse);
  }
});

test('AbortController signal aborts on the requested budget', async () => {
  const abort = startClientAbort(40);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(abort.signal.aborted, true);
  abort.finish();
});

test('finish() cancels the timer so a completed request is not aborted', async () => {
  const abort = startClientAbort(40);
  abort.finish();
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(abort.signal.aborted, false);
});

test('installed functions-js invoke honors AbortSignal and returns before the platform idle timeout', async () => {
  const server = http.createServer(() => {
    // Leave the socket open so only the client abort can finish the call.
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind');

  const client = new FunctionsClient(`http://127.0.0.1:${address.port}`);
  const abort = startClientAbort(200);
  const started = Date.now();
  const { data, error } = await client.invoke('generate-itinerary', {
    body: { destination: 'Kyoto' },
    signal: abort.signal,
  });
  const elapsed = Date.now() - started;
  abort.finish();
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close((closeError) => closeError ? reject(closeError) : resolve()));

  assert.equal(data, null);
  assert.ok(error);
  assert.equal(abort.signal.aborted, true);
  assert.ok(elapsed < 2_000, `invoke stayed open for ${elapsed}ms`);
  assert.ok(elapsed >= 150, `invoke failed immediately (${elapsed}ms) instead of waiting for the signal`);
});
