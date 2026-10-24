import { supabase } from "../lib/supabase";
import { Itinerary } from "../types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CLIENT_WAIT_MS,
  isAbortLike,
  ItineraryErrorPayload,
  messageFromItineraryPayload,
} from "./itineraryErrors";

// Direct browser API calls are blocked by location - must use Edge Function
const USE_LOCAL_AI = false;

const generatePrompt = (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string
) => `You are a professional local travel guide creating an ultra-detailed itinerary for ${destination} from ${startDate} to ${endDate}.
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

Remember: tips and transport MUST be comprehensive with at least 50 words each. Include all days from ${startDate} to ${endDate}.`;

// Local development: Direct Gemini API call
const generateWithLocalAI = async (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string
) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = generatePrompt(destination, startDate, endDate, preferences, specialRequests, language);
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
};

async function readInvokePayload(error: unknown): Promise<ItineraryErrorPayload | null> {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!context) return null;
  try {
    if (typeof Response !== 'undefined' && context instanceof Response) {
      return await context.json() as ItineraryErrorPayload;
    }
    const body = (context as { body?: unknown }).body;
    if (body instanceof ReadableStream) {
      return JSON.parse(await new Response(body).text()) as ItineraryErrorPayload;
    }
  } catch {
    return null;
  }
  return null;
}

// Production: Supabase Edge Function
const generateWithEdgeFunction = async (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string
) => {
  const { data, error } = await supabase.functions.invoke('generate-itinerary', {
    body: {
      destination,
      startDate,
      endDate,
      preferences,
      specialRequests,
      language
    },
    timeout: CLIENT_WAIT_MS,
  });

  if (error) {
    const payload = await readInvokePayload(error);
    const message = messageFromItineraryPayload(payload);
    console.error("Edge Function error", { code: payload?.code ?? (isAbortLike(error) ? 'timeout' : 'unknown') });
    if (message) {
      throw new Error(message);
    }
    if (isAbortLike(error)) {
      throw new Error('Itinerary generation timed out. Please try again.');
    }
    throw new Error('Failed to generate itinerary. Please try again.');
  }

  console.log("Edge Function response:", data);
  return Array.isArray(data) ? data[0] : data;
};

export const generateItinerary = async (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string = 'en'
): Promise<Itinerary> => {
  console.log(`Using ${USE_LOCAL_AI ? 'LOCAL' : 'EDGE FUNCTION'} AI`);

  const responseData = USE_LOCAL_AI
    ? await generateWithLocalAI(destination, startDate, endDate, preferences, specialRequests, language)
    : await generateWithEdgeFunction(destination, startDate, endDate, preferences, specialRequests, language);

  if (responseData?.error) {
    console.error("API error", { code: responseData.code ?? 'unknown' });
    throw new Error(messageFromItineraryPayload(responseData) || responseData.error);
  }

  const itinerary: Itinerary = {
    id: `temp-${Date.now()}`,
    title: responseData.title || `${destination} Trip`,
    location: destination,
    startDate: startDate,
    endDate: endDate,
    days: responseData.days || [],
    budget: responseData.budget || 'Medium',
    description: responseData.description || '',
    coverImage: undefined,
    generated: true,
    author: {
      name: 'AI',
      avatar: 'https://i.pravatar.cc/150?u=ai',
      role: 'AI Travel Planner'
    },
    tags: [destination],
    likes: 0,
    status: 'draft'
  };

  return itinerary;
};