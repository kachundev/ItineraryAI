
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { destination, startDate, endDate, preferences, specialRequests, language } = await req.json()

    // Initialize Gemini
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY')
    }
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `
      Create a detailed travel itinerary for a trip to ${destination}.
      Dates: ${startDate} to ${endDate}.
      Traveler Preferences: ${preferences?.join(', ') || 'General sightseeing'}.
      Special Requests: ${specialRequests || 'None'}.
      Language: ${language || 'en'}.

      The output MUST be a valid JSON object matching this structure:
      {
        "title": "Trip Title",
        "description": "Brief description of the trip",
        "budget": "estimated budget (Low/Medium/High)",
        "days": [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "title": "Day Theme",
            "activities": [
              {
                "time": "HH:MM",
                "title": "Activity Title",
                "description": "Activity description",
                "type": "sightseeing|food|transport|etc",
                "location": "Location name",
                "duration": "minutes",
                "cost": "approx cost"
              }
            ]
          }
        ]
      }

      Ensure the JSON is valid and lists activities for every day of the trip.
      Return ONLY the JSON object, no markdown formatting.
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Clean up potential markdown code blocks
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    const data = JSON.parse(jsonStr)

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
