import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  DEFAULT_MODEL,
  MISSING_KEY_FAILURE,
  SYSTEM_PROMPT,
  TIMEOUT_FAILURE,
  UPSTREAM_TIMEOUT_MS,
  XAI_CHAT_COMPLETIONS_URL,
  buildChatRequest,
  buildUserPrompt,
  errorBody,
  failure,
  isAbortError,
  parseItinerary,
  readModelMessage,
  readUsage,
  resolveModel,
  upstreamErrorCode,
  upstreamFailure,
  validateTripInput,
} from './logic.ts'
import type { Failure } from './logic.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const started = Date.now()
  let model = DEFAULT_MODEL
  let dayCount: number | undefined

  const elapsed = () => Date.now() - started
  const sendError = (error: Failure, extra: Record<string, unknown> = {}) => {
    logOutcome({
      outcome: 'error',
      errorCode: error.code,
      model,
      latencyMs: elapsed(),
      dayCount,
      ...extra,
    })
    return json(errorBody(error), error.status)
  }

  // This function returns JSON only. It does not write the itinerary.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return sendError(failure('invalid_input', 'Request body must be JSON.', 400))
  }

  const validated = validateTripInput(body)
  if (!validated.ok) return sendError(validated.failure)

  const trip = validated.trip
  dayCount = trip.dayCount
  const userPrompt = buildUserPrompt(trip)
  const promptChars = SYSTEM_PROMPT.length + userPrompt.length

  model = resolveModel(Deno.env.get('XAI_MODEL'))
  const apiKey = Deno.env.get('XAI_API_KEY')
  if (!apiKey) {
    return sendError(MISSING_KEY_FAILURE, { reason: 'missing_api_key', promptChars })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const response = await fetch(XAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildChatRequest(model, userPrompt)),
      signal: controller.signal,
    })

    if (!response.ok) {
      const upstreamError = upstreamErrorCode(await response.text())
      return sendError(upstreamFailure(response.status), {
        promptChars,
        upstreamStatus: response.status,
        upstreamErrorCode: upstreamError,
      })
    }

    const raw = await response.text()
    let payload: unknown
    try {
      payload = JSON.parse(raw)
    } catch {
      return sendError(failure(
        'parse_error',
        'The travel planner returned an unreadable itinerary. Please try again.',
        502,
      ), { promptChars, upstreamStatus: response.status })
    }

    const message = readModelMessage(payload)
    const usage = readUsage(payload)
    if (!message || !message.text || message.refusal) {
      const declined = message?.refusal === true
      return sendError(failure(
        declined ? 'upstream_error' : 'parse_error',
        declined
          ? 'The travel planner declined this trip. Adjust the destination or requests and try again.'
          : 'The travel planner returned an unreadable itinerary. Please try again.',
        502,
      ), {
        promptChars,
        upstreamStatus: response.status,
        finishReason: message?.finishReason,
        refusal: declined,
        ...usage,
      })
    }

    const parsed = parseItinerary(message.text, {
      finishReason: message.finishReason,
      expectedDays: trip.dayCount,
    })
    if (!parsed.ok) {
      return sendError(parsed.failure, {
        promptChars,
        upstreamStatus: response.status,
        finishReason: message.finishReason,
        ...usage,
      })
    }

    logOutcome({
      outcome: 'ok',
      errorCode: null,
      model,
      latencyMs: elapsed(),
      dayCount,
      promptChars,
      upstreamStatus: response.status,
      finishReason: message.finishReason,
      ...usage,
    })
    return json(parsed.data, 200)
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      return sendError(TIMEOUT_FAILURE, { promptChars })
    }
    const reason = error instanceof Error ? error.name : 'fetch_failed'
    return sendError(upstreamFailure(0), { promptChars, reason })
  } finally {
    clearTimeout(timer)
  }
})

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function logOutcome(entry: Record<string, unknown>) {
  const payload: Record<string, unknown> = { fn: 'generate-itinerary' }
  for (const [key, value] of Object.entries(entry)) {
    if (value !== undefined) payload[key] = value
  }
  console.log(JSON.stringify(payload))
}
