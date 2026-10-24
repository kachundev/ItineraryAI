import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const XAI_CHAT_COMPLETIONS_URL = 'https://api.x.ai/v1/chat/completions'
const DEFAULT_MODEL = 'grok-4.7'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const destination = requireString(body.destination, 'destination', 200)
    const startDate = requireString(body.startDate, 'startDate', 40)
    const endDate = requireString(body.endDate, 'endDate', 40)
    const specialRequests = optionalString(body.specialRequests, 2000)
    const language = optionalString(body.language, 20) || 'en'
    const preferences = normalizePreferences(body.preferences)

    const apiKey = Deno.env.get('XAI_API_KEY')
    if (!apiKey) {
      throw new HttpError('Missing XAI_API_KEY. Set it as a Supabase Edge Function secret.', 500)
    }

    const model = Deno.env.get('XAI_MODEL') || DEFAULT_MODEL
    const prompt = buildPrompt(destination, startDate, endDate, preferences, specialRequests, language)
    const text = await callGrok(prompt, apiKey, model)
    const data = parseModelJson(text)

    return json(data, 200)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400
    const message = error instanceof Error ? error.message : String(error)
    console.error('generate-itinerary failed:', message)
    return json({ error: message }, status)
  }
})

class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(`Missing ${field}`, 400)
  }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    throw new HttpError(`${field} is too long`, 400)
  }
  return trimmed
}

function optionalString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function normalizePreferences(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 80)
    .slice(0, 12)
}

async function callGrok(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch(XAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional local travel guide. Reply with one JSON object only. Do not wrap it in markdown.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  const raw = await response.text()
  if (!response.ok) {
    throw new HttpError(`xAI request failed (${response.status}): ${summarizeUpstreamError(raw)}`, 502)
  }

  let payload: { choices?: Array<{ message?: { content?: unknown } }> }
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new HttpError('xAI returned a non-JSON response', 502)
  }

  const content = readMessageContent(payload.choices?.[0]?.message?.content)
  if (!content) {
    throw new HttpError('xAI response did not include message content', 502)
  }
  return content
}

function summarizeUpstreamError(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    const message = parsed?.error?.message || parsed?.error || parsed?.message
    if (typeof message === 'string' && message.trim()) return message.slice(0, 500)
  } catch {
    // Fall through to the raw slice.
  }
  return raw.slice(0, 500)
}

function readMessageContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((part) => {
    if (typeof part === 'string') return part
    if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
      return part.text
    }
    return ''
  }).join('')
}

function parseModelJson(text: string): unknown {
  const extracted = extractJsonText(text)
  try {
    return JSON.parse(extracted)
  } catch (parseError) {
    console.log('Initial parse failed, attempting to repair JSON...')
    const repairedText = repairTruncatedJson(extracted)
    try {
      const data = JSON.parse(repairedText)
      console.log('JSON repair successful')
      return data
    } catch {
      const message = parseError instanceof Error ? parseError.message : String(parseError)
      throw new HttpError(`Failed to parse AI response: ${message}`, 502)
    }
  }
}

function extractJsonText(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

function repairTruncatedJson(text: string): string {
  let repairedText = text.trim()
  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let lastChar = ''

  for (const char of repairedText) {
    if (char === '"' && lastChar !== '\\') inString = !inString
    if (!inString) {
      if (char === '{') openBraces++
      if (char === '}') openBraces--
      if (char === '[') openBrackets++
      if (char === ']') openBrackets--
    }
    lastChar = char
  }

  if (inString) repairedText += '"'
  while (openBrackets > 0) {
    repairedText += ']'
    openBrackets--
  }
  while (openBraces > 0) {
    repairedText += '}'
    openBraces--
  }
  return repairedText
}

function buildPrompt(
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string,
) {
  return `You are a professional local travel guide creating an ultra-detailed itinerary for ${destination} from ${startDate} to ${endDate}.
Preferences: ${preferences.length > 0 ? preferences.join(', ') : 'General sightseeing'}
Special requests: ${specialRequests || 'None'}
Language: ${language || 'en'}

CRITICAL REQUIREMENTS:
1. Each day: MINIMUM 4 attractions (ideally 5-6) + breakfast + lunch + dinner. Never less than 4 attractions per day!
2. For meals: include restaurantOptions array with 3 restaurants
3. MOST IMPORTANT: Write VERY DETAILED tips and transport sections (minimum 50 words each)

For "tips" field, include ALL of these details:
- Best time to visit (morning/afternoon/evening, avoid weekends?)
- Where to buy tickets (online in advance? at entrance? which counter?)
- Recommended visiting duration
- Must-see spots inside the attraction
- Photo tips (best angles, sunset/sunrise timing)
- What to wear or bring (comfortable shoes, umbrella, etc.)
- Things to avoid (tourist traps, overpriced areas)
- Insider tips locals know

For "transport" field, include ALL of these details:
- Exact metro/bus line numbers and names
- Which station to board and which to alight
- Which exit to take (Exit A, Exit 2, etc.)
- Walking time from station to destination
- Alternative transport options (taxi fare estimate, bus numbers)
- Transfer instructions if needed
- Landmarks to look for when walking

Return this JSON structure:
{
  "title": "string",
  "description": "string",
  "budget": "Medium",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day Theme",
      "activities": [
        {
          "time": "08:00",
          "title": "Breakfast",
          "description": "Detailed description of the breakfast experience and food culture in this area",
          "type": "breakfast",
          "location": "District/Street Name",
          "duration": "60",
          "cost": "$$",
          "tips": "Detailed tips about dining in this area, best dishes to try, busy hours to avoid, local eating customs",
          "restaurantOptions": [
            {
              "name": "Restaurant Name",
              "cuisine": "Cuisine Type",
              "rating": "4.5",
              "description": "Detailed description including: signature dishes, must-order items, price range per person, reservation tips, best seats, what locals recommend, opening hours",
              "priceLevel": "$$"
            }
          ]
        },
        {
          "time": "09:30",
          "title": "Attraction Name",
          "description": "Comprehensive description of what this place is, its history, significance, and what makes it special. Describe the atmosphere and experience visitors can expect.",
          "type": "sightseeing",
          "location": "Full street address with district",
          "duration": "120",
          "cost": "$20 (or Free)",
          "tips": "VERY DETAILED: 1) Best visiting hours and why. 2) Ticket info - buy online at [website] 2 days ahead to skip lines, or at Gate B counter which is less crowded. 3) Must-see highlights inside. 4) Best photo spots and timing. 5) Insider tips - what most tourists miss but locals love. 6) What to avoid. 7) Recommended route inside.",
          "transport": "VERY DETAILED: From previous location, take Metro Line X (红色线) from Station A, ride 5 stops to Station B (approximately 12 minutes). Take Exit 3 and turn left. Walk straight for 300 meters, you will pass a convenience store and a park on your right. The entrance is on your left, marked by a large sign. Alternative: Take Bus 123 from the main road (15 minutes, ¥2)."
        },
        {
          "time": "12:00",
          "title": "Lunch",
          "description": "Description of the lunch area and local food scene",
          "type": "lunch",
          "location": "Area name",
          "duration": "90",
          "cost": "$$",
          "tips": "Detailed lunch tips",
          "restaurantOptions": [
            {"name": "Restaurant", "cuisine": "Type", "rating": "4.5", "description": "Full details including signature dish, what to order, average price, peak hours, reservation needed?", "priceLevel": "$$"}
          ]
        },
        {
          "time": "18:00",
          "title": "Dinner",
          "description": "Evening dining experience description",
          "type": "dinner",
          "location": "District",
          "duration": "120",
          "cost": "$$$",
          "tips": "Dinner tips including best time to arrive, dress code if any, must-try dishes",
          "restaurantOptions": [
            {"name": "Restaurant", "cuisine": "Type", "rating": "4.6", "description": "Complete details: what makes it special, reservation info, best dishes, price per person, atmosphere", "priceLevel": "$$$"}
          ]
        }
      ]
    }
  ]
}

Remember: tips and transport MUST be comprehensive with at least 50 words each. Include all days from ${startDate} to ${endDate}. Shape the days around the listed preferences when they are more specific than general sightseeing.`
}
