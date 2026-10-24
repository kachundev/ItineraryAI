import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CLIENT_WAIT_MS,
  isAbortLike,
  messageFromItineraryPayload,
} from './itineraryErrors.ts'

test('client wait stays inside the 60s bound', () => {
  assert.equal(CLIENT_WAIT_MS, 60_000)
  assert.ok(CLIENT_WAIT_MS <= 60_000)
  assert.ok(CLIENT_WAIT_MS > 45_000)
})

test('timeout and platform idle timeout become a user-facing timeout message', () => {
  assert.equal(
    messageFromItineraryPayload({ error: 'Itinerary generation timed out. Please try again.', code: 'timeout' }),
    'Itinerary generation timed out. Please try again.',
  )
  assert.equal(
    messageFromItineraryPayload({ code: 'IDLE_TIMEOUT', message: 'Request idle timeout limit (150s) reached' }),
    'Itinerary generation timed out. Please try again.',
  )
  assert.equal(
    messageFromItineraryPayload({ code: 'unauthorized' }),
    'Please sign in and try again.',
  )
  assert.equal(
    messageFromItineraryPayload({ code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'invalid' }),
    'Please sign in and try again.',
  )
  assert.equal(
    messageFromItineraryPayload({ error: 'Missing destination.', code: 'invalid_input' }),
    'Missing destination.',
  )
})

test('abort errors are recognized from the fetch cause', () => {
  const abortError = new Error('The operation was aborted')
  abortError.name = 'AbortError'
  assert.equal(isAbortLike(abortError), true)
  assert.equal(isAbortLike({ name: 'FunctionsFetchError', message: 'Failed to send a request', context: abortError }), true)
  assert.equal(isAbortLike({ name: 'FunctionsHttpError', message: 'non-2xx', context: { status: 504 } }), false)
})
