export const XAI_CHAT_COMPLETIONS_URL = 'https://api.x.ai/v1/chat/completions'
export const DEFAULT_MODEL = 'grok-4.7'
export const MAX_OUTPUT_TOKENS = 4096
export const UPSTREAM_TIMEOUT_MS = 45_000
export const MAX_TRIP_DAYS = 14

export type ErrorCode =
  | 'unauthorized'
  | 'invalid_input'
  | 'upstream_error'
  | 'timeout'
  | 'parse_error'
  | 'db_error'

export class HttpError extends Error {
  status: number
  code: ErrorCode
  detail: string | null

  constructor(message: string, status: number, code: ErrorCode, detail: string | null = null) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

export type NormalizedTrip = {
  destination: string
  startDate: string
  endDate: string
  dates: string[]
  preferences: string[]
  specialRequests: string
  language: string
}

export type ChatCompletionBody = {
  model: string
  messages: Array<{ role: 'system' | 'user'; content: string }>
  response_format: { type: 'json_object' }
  max_tokens: number
  max_completion_tokens: number
  reasoning_effort: 'low'
  search_parameters: { mode: 'off' }
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  return new HttpError(
    'The itinerary service is unavailable. Please try again.',
    500,
    'upstream_error',
    'unhandled',
  )
}

export function resolveModel(configured: string | undefined | null): string {
  const trimmed = configured?.trim() ?? ''
  if (!trimmed || trimmed.length > 64 || !/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    return DEFAULT_MODEL
  }
  return trimmed
}

export function normalizeTrip(body: unknown): NormalizedTrip {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError('Request body must be a JSON object.', 400, 'invalid_input', 'body_type')
  }
  const record = body as Record<string, unknown>
  const destination = requireText(record.destination, 'destination', 120)
  const startDate = requireText(record.startDate, 'startDate', 40)
  const endDate = requireText(record.endDate, 'endDate', 40)
  const dates = enumerateDates(startDate, endDate)
  const language = optionalText(record.language, 20) || 'en'
  const specialRequests = optionalText(record.specialRequests, 400)
  const preferences = normalizePreferences(record.preferences)
  return { destination, startDate, endDate, dates, preferences, specialRequests, language }
}

export function buildPrompt(trip: NormalizedTrip): string {
  const preferences = trip.preferences.length > 0 ? trip.preferences.join(', ') : 'General sightseeing'
  const requests = trip.specialRequests || 'None'
  return [
    `Plan a ${trip.dates.length}-day trip to ${trip.destination}.`,
    `Dates, in order, one day each: ${trip.dates.join(', ')}.`,
    `Write every user-facing string in this language: ${trip.language}.`,
    `Preferences: ${preferences}.`,
    `Special requests: ${requests}.`,
    'Return one JSON object and no other text.',
    'Each day has exactly 6 activities in this order: breakfast, sightseeing, sightseeing, lunch, sightseeing, dinner.',
    'Use real places in the destination. One short sentence per text field.',
    'description max 25 words. tips max 20 words. transport max 20 words.',
    'Meals include restaurantOptions with exactly 1 restaurant. Sightseeing includes tips and transport.',
    'JSON shape: {"title":"","description":"","budget":"Medium","days":[{"day":1,"date":"YYYY-MM-DD","title":"","activities":[{"time":"09:00","title":"","description":"","type":"breakfast","location":"","duration":"60","cost":"$","tips":"","transport":"","restaurantOptions":[{"name":"","cuisine":"","rating":"4.5","description":"","priceLevel":"$$"}]}]}]}',
    'Do not add days, activities, or restaurants beyond this shape.',
  ].join('\n')
}

export function buildChatCompletionBody(prompt: string, model: string): ChatCompletionBody {
  return {
    model,
    messages: [
      {
        role: 'system',
        content: 'You write compact travel itineraries as a single JSON object. No markdown.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    // max_tokens is the required chat-completions cap. grok-4.7 also honors
    // max_completion_tokens for visible output (reasoning tokens are separate).
    max_tokens: MAX_OUTPUT_TOKENS,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    // grok-4.7 defaults to high reasoning, which blows the edge idle budget.
    reasoning_effort: 'low',
    search_parameters: { mode: 'off' },
  }
}

export async function callXai(
  prompt: string,
  apiKey: string,
  model: string,
  options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? UPSTREAM_TIMEOUT_MS
  const fetchImpl = options.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(XAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildChatCompletionBody(prompt, model)),
      signal: controller.signal,
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new HttpError(
        'The itinerary service returned an error. Please try again.',
        502,
        'upstream_error',
        upstreamDetail(response.status, raw),
      )
    }
    if (raw.length > 500_000) {
      throw new HttpError(
        'The itinerary service returned an unreadable response.',
        502,
        'upstream_error',
        'response_too_large',
      )
    }
    return readCompletionContent(raw)
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (isAbortError(error) || controller.signal.aborted) {
      throw new HttpError(
        'Itinerary generation timed out. Please try again.',
        504,
        'timeout',
        'abort',
      )
    }
    throw new HttpError(
      'The itinerary service is unavailable. Please try again.',
      502,
      'upstream_error',
      'network',
    )
  } finally {
    clearTimeout(timer)
  }
}

export function parseItineraryJson(text: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonText(text))
  } catch {
    throw new HttpError(
      'The itinerary could not be read. Please try again.',
      502,
      'parse_error',
      'invalid_json',
    )
  }
  if (!isItineraryPayload(parsed)) {
    throw new HttpError(
      'The itinerary could not be read. Please try again.',
      502,
      'parse_error',
      'invalid_shape',
    )
  }
  return parsed
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String((error as { name?: unknown }).name ?? '') : ''
  if (name === 'AbortError') return true
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
  return /aborted|abort/i.test(message)
}

function upstreamDetail(status: number, raw: string): string {
  let kind = ''
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: unknown }; code?: unknown }
    const code = parsed?.error && typeof parsed.error === 'object' ? parsed.error.code : parsed?.code
    if (typeof code === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(code)) kind = `_${code}`
  } catch {
    // Status alone is enough when the body is not JSON.
  }
  return `upstream_${status}${kind}`
}

function readCompletionContent(raw: string): string {
  let payload: { choices?: Array<{ message?: { content?: unknown } }> }
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new HttpError(
      'The itinerary service returned an unreadable response.',
      502,
      'upstream_error',
      'upstream_body',
    )
  }
  const content = readMessageContent(payload.choices?.[0]?.message?.content)
  if (!content.trim()) {
    throw new HttpError(
      'The itinerary service returned an empty response.',
      502,
      'upstream_error',
      'empty_content',
    )
  }
  return content
}

function readMessageContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((part) => {
    if (typeof part === 'string') return part
    if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
      return (part as { text: string }).text
    }
    return ''
  }).join('')
}

function extractJsonText(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

function isItineraryPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const days = (value as { days?: unknown }).days
  if (!Array.isArray(days) || days.length === 0) return false
  return days.every((day) => {
    if (!day || typeof day !== 'object' || Array.isArray(day)) return false
    const activities = (day as { activities?: unknown }).activities
    return Array.isArray(activities) && activities.length > 0
  })
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  if (end.getTime() < start.getTime()) {
    throw new HttpError('End date cannot be earlier than start date.', 400, 'invalid_input', 'date_order')
  }
  const dates: string[] = []
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 86_400_000) {
    dates.push(new Date(cursor).toISOString().slice(0, 10))
    if (dates.length > MAX_TRIP_DAYS) {
      throw new HttpError(
        `Trips longer than ${MAX_TRIP_DAYS} days cannot be generated in one request.`,
        400,
        'invalid_input',
        'trip_too_long',
      )
    }
  }
  return dates
}

function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError('Dates must use YYYY-MM-DD.', 400, 'invalid_input', 'date_format')
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError('Dates are invalid.', 400, 'invalid_input', 'date_value')
  }
  return date
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new HttpError(`Missing ${field}.`, 400, 'invalid_input', 'missing_field')
  }
  const cleaned = cleanText(value)
  if (!cleaned) {
    throw new HttpError(`Missing ${field}.`, 400, 'invalid_input', 'missing_field')
  }
  if (cleaned.length > maxLength) {
    throw new HttpError(`${field} is too long.`, 400, 'invalid_input', 'field_too_long')
  }
  return cleaned
}

function optionalText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return cleanText(value).slice(0, maxLength)
}

function normalizePreferences(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const preferences: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const cleaned = cleanText(item)
    if (!cleaned || cleaned.length > 40 || seen.has(cleaned)) continue
    seen.add(cleaned)
    preferences.push(cleaned)
    if (preferences.length === 8) break
  }
  return preferences
}

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
}
