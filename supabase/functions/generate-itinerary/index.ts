
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
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

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY')
    }
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 65536
      }
    })

    const prompt = `You are a professional local travel guide creating an ultra-detailed itinerary for ${destination} from ${startDate} to ${endDate}.
Preferences: ${preferences?.join(', ') || 'General sightseeing'}
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

Remember: tips and transport MUST be comprehensive with at least 50 words each. Include all days from ${startDate} to ${endDate}.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Try to parse, if fails attempt to repair truncated JSON
    let data
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      console.log('Initial parse failed, attempting to repair JSON...')
      // Try to repair truncated JSON by closing open brackets/braces
      let repairedText = text.trim()

      // Count unclosed brackets
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

      // If we're in a string, close it
      if (inString) repairedText += '"'

      // Close any open brackets/braces
      while (openBrackets > 0) {
        repairedText += ']'
        openBrackets--
      }
      while (openBraces > 0) {
        repairedText += '}'
        openBraces--
      }

      try {
        data = JSON.parse(repairedText)
        console.log('JSON repair successful')
      } catch (repairError) {
        throw new Error(`Failed to parse AI response: ${parseError.message}`)
      }
    }

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

