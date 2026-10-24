import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  callXai,
  DEFAULT_MODEL,
  HttpError,
  normalizeTrip,
  buildPrompt,
  parseItineraryJson,
  resolveModel,
  toHttpError,
  type ErrorCode,
} from './logic.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-request-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const started = performance.now()
  const requestId = crypto.randomUUID()
  const model = resolveModel(Deno.env.get('XAI_MODEL') ?? DEFAULT_MODEL)
  let outcome: 'success' | 'error' = 'error'
  let errorCode: ErrorCode | null = null
  let detail: string | null = null

  try {
    assertBearer(req)
    if (req.method !== 'POST') {
      throw new HttpError('Use POST.', 405, 'invalid_input', 'method')
    }
    const declaredLength = Number(req.headers.get('content-length') ?? '0')
    if (Number.isFinite(declaredLength) && declaredLength > 20_000) {
      throw new HttpError('Request body is too large.', 400, 'invalid_input', 'body_too_large')
    }

    const trip = normalizeTrip(await readJsonBody(req))
    const apiKey = Deno.env.get('XAI_API_KEY')?.trim() ?? ''
    if (!apiKey) {
      throw new HttpError(
        'The itinerary service is unavailable. Please try again.',
        500,
        'upstream_error',
        'missing_api_key',
      )
    }

    const text = await callXai(buildPrompt(trip), apiKey, model)
    const itinerary = parseItineraryJson(text)
    outcome = 'success'
    return json(itinerary, 200, requestId)
  } catch (error) {
    const http = toHttpError(error)
    errorCode = http.code
    detail = http.detail
    return json({ error: http.message, code: http.code }, http.status, requestId)
  } finally {
    console.log(JSON.stringify({
      requestId,
      latencyMs: Math.round(performance.now() - started),
      model,
      outcome,
      errorCode,
      ...(detail ? { detail } : {}),
    }))
  }
})

function assertBearer(req: Request) {
  const header = req.headers.get('Authorization') ?? ''
  const match = /^Bearer\s+(\S+)/i.exec(header)
  if (!match || match[1].length < 20) {
    throw new HttpError('Authentication is required.', 401, 'unauthorized', 'missing_bearer')
  }
}

async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new HttpError('Request body must be JSON.', 400, 'invalid_input', 'invalid_json')
  }
}

function json(payload: unknown, status: number, requestId: string) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'x-request-id': requestId,
    },
  })
}
