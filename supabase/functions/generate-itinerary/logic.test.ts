import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildChatCompletionBody,
  buildPrompt,
  callXai,
  HttpError,
  MAX_OUTPUT_TOKENS,
  MAX_TRIP_DAYS,
  normalizeTrip,
  parseItineraryJson,
  resolveModel,
  UPSTREAM_TIMEOUT_MS,
} from './logic.ts'

const kyoto = {
  destination: 'Kyoto',
  startDate: '2026-11-01',
  endDate: '2026-11-03',
  preferences: ['temples', 'food'],
  specialRequests: 'vegetarian breakfast',
  language: 'en',
}

test('upstream wait is capped at 45s and output tokens at 4096', () => {
  assert.equal(UPSTREAM_TIMEOUT_MS, 45_000)
  assert.ok(UPSTREAM_TIMEOUT_MS <= 45_000)
  assert.equal(MAX_OUTPUT_TOKENS, 4096)
})

test('3-day prompt is a single compact request', () => {
  const trip = normalizeTrip(kyoto)
  const prompt = buildPrompt(trip)
  assert.equal(trip.dates.length, 3)
  assert.match(prompt, /2026-11-01, 2026-11-02, 2026-11-03/)
  assert.match(prompt, /exactly 6 activities/)
  assert.match(prompt, /exactly 1 restaurant/)
  assert.doesNotMatch(prompt, /50 words|5-6|MINIMUM 4|ultra-detailed|3 restaurants/i)
  assert.ok(prompt.length < 1800, `prompt is ${prompt.length} chars`)
})

test('chat completion body sets max_tokens, low reasoning, and no search', () => {
  const body = buildChatCompletionBody('prompt', 'grok-4.7')
  assert.equal(body.model, 'grok-4.7')
  assert.equal(body.max_tokens, 4096)
  assert.equal(body.max_completion_tokens, 4096)
  assert.equal(body.reasoning_effort, 'low')
  assert.equal(body.search_parameters.mode, 'off')
  assert.equal(body.response_format.type, 'json_object')
  assert.equal(body.messages.length, 2)
})

test('invalid dates and missing destination are invalid_input', () => {
  assert.throws(() => normalizeTrip({ ...kyoto, destination: '  ' }), (error: unknown) => {
    return error instanceof HttpError && error.code === 'invalid_input' && error.status === 400
  })
  assert.throws(() => normalizeTrip({ ...kyoto, endDate: '2026-10-01' }), (error: unknown) => {
    return error instanceof HttpError && error.code === 'invalid_input'
  })
  assert.throws(() => normalizeTrip({ ...kyoto, startDate: '2026-02-31' }), (error: unknown) => {
    return error instanceof HttpError && error.code === 'invalid_input'
  })
  const tooLong = { ...kyoto, endDate: '2026-11-20' }
  assert.throws(() => normalizeTrip(tooLong), (error: unknown) => {
    return error instanceof HttpError && error.code === 'invalid_input' && error.detail === 'trip_too_long'
  })
  assert.equal(MAX_TRIP_DAYS, 14)
})

test('model override is used only when it is a plain model id', () => {
  assert.equal(resolveModel(undefined), 'grok-4.7')
  assert.equal(resolveModel('  grok-4 '), 'grok-4')
  assert.equal(resolveModel('grok\n4'), 'grok-4.7')
  assert.equal(resolveModel(''), 'grok-4.7')
})

test('callXai aborts at the deadline with code timeout and does not retry', async () => {
  let calls = 0
  const fetchImpl: typeof fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
    calls += 1
    const signal = init?.signal
    assert.ok(signal)
    signal.addEventListener('abort', () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      reject(error)
    })
  })

  const started = Date.now()
  await assert.rejects(
    () => callXai('prompt', 'test-key', 'grok-4.7', { timeoutMs: 30, fetchImpl }),
    (error: unknown) => {
      return error instanceof HttpError &&
        error.code === 'timeout' &&
        error.status === 504 &&
        !error.message.includes('IDLE_TIMEOUT')
    },
  )
  assert.equal(calls, 1)
  assert.ok(Date.now() - started < 1000)
})

test('callXai sends one capped request and does not leak upstream bodies', async () => {
  let calls = 0
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls += 1
    const body = JSON.parse(String(init?.body))
    assert.equal(body.max_tokens, 4096)
    assert.equal(body.reasoning_effort, 'low')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key')
    return new Response(JSON.stringify({ error: 'secret upstream detail Kyoto vegetarian' }), { status: 500 })
  }

  await assert.rejects(
    () => callXai('do not log Kyoto vegetarian', 'test-key', 'grok-4.7', { fetchImpl }),
    (error: unknown) => {
      return error instanceof HttpError &&
        error.code === 'upstream_error' &&
        error.status === 502 &&
        error.detail === 'upstream_500' &&
        !error.message.includes('Kyoto') &&
        !error.message.includes('secret')
    },
  )
  assert.equal(calls, 1)
})

test('successful content is parsed once and truncated JSON is not repaired', async () => {
  const itinerary = {
    title: 'Kyoto',
    days: [{ day: 1, date: '2026-11-01', activities: [{ title: 'Fushimi Inari' }] }],
  }
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(itinerary) } }],
  }), { status: 200 })

  const text = await callXai('prompt', 'test-key', 'grok-4.7', { fetchImpl })
  assert.deepEqual(parseItineraryJson(text), itinerary)

  assert.throws(() => parseItineraryJson('{"days":[{"activities":['), (error: unknown) => {
    return error instanceof HttpError && error.code === 'parse_error' && error.status === 502
  })
  assert.throws(() => parseItineraryJson('{"days":[]}'), (error: unknown) => {
    return error instanceof HttpError && error.code === 'parse_error'
  })
})

test('handler returns JSON only and forces JWT verification', () => {
  const index = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
  const config = readFileSync(new URL('../../config.toml', import.meta.url), 'utf8')
  assert.doesNotMatch(index, /\.from\(|\.insert\(|\.upsert\(|GEMINI_API_KEY/)
  assert.match(index, /XAI_API_KEY/)
  assert.match(config, /verify_jwt\s*=\s*true/)
  assert.doesNotMatch(config, /verify_jwt\s*=\s*false/)
})
