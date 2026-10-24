export const CLIENT_WAIT_MS = 60_000

export type ItineraryErrorPayload = {
  error?: unknown
  code?: unknown
  message?: unknown
}

const TIMEOUT_MESSAGE = 'Itinerary generation timed out. Please try again.'
const UNAUTHORIZED_MESSAGE = 'Please sign in and try again.'

export function messageFromItineraryPayload(payload: ItineraryErrorPayload | null | undefined): string | null {
  if (!payload || typeof payload !== 'object') return null
  const code = typeof payload.code === 'string' ? payload.code : ''
  const error = typeof payload.error === 'string' ? payload.error.trim() : ''

  if (code === 'timeout' || code === 'IDLE_TIMEOUT') {
    return error || TIMEOUT_MESSAGE
  }
  if (code === 'unauthorized' || code.startsWith('UNAUTHORIZED')) {
    return error || UNAUTHORIZED_MESSAGE
  }
  if (error) return error
  return null
}

export function isAbortLike(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { name?: unknown; message?: unknown; context?: unknown }
  if (record.name === 'AbortError') return true
  if (typeof record.message === 'string' && /aborted|abort/i.test(record.message)) return true
  const context = record.context
  if (!context || typeof context !== 'object') return false
  const cause = context as { name?: unknown; message?: unknown }
  if (cause.name === 'AbortError') return true
  return typeof cause.message === 'string' && /aborted|abort/i.test(cause.message)
}
