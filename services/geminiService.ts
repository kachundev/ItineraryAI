import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Itinerary } from "../types";

// Helper to get a dynamic image based on a keyword
const getTravelImage = (keyword: string) => {
  // Using Pollinations.ai for reliable dynamic image generation based on text prompts
  const encoded = encodeURIComponent(keyword + " travel photography high quality");
  return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&nologo=true`;
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const itinerarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A catchy title for the trip" },
    description: { type: Type.STRING, description: "A brief summary of the entire trip experience" },
    budget: { type: Type.STRING, description: "Estimated total budget, e.g., $1,200 or ¥150,000" },
    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g., #Nature, #Foodie" },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Theme of the day" },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING, description: "e.g., 09:00 AM" },
                type: { type: Type.STRING, description: "Values must be: 'Sightseeing', 'Breakfast', 'Lunch', 'Dinner', 'Adventure', 'Relaxation', 'Transport'" },
                title: { type: Type.STRING },
                description: { type: Type.STRING, description: "Detailed description of the activity and why it fits the user." },
                location: { type: Type.STRING },
                duration: { type: Type.STRING },
                imageKeyword: { type: Type.STRING, description: "A short English search term for an image of this place" },
                
                // Detailed Guides
                tips: { type: Type.STRING, description: "Comprehensive guide: ticket booking, best photo spots, hidden gems, pitfalls to avoid." },
                transport: { type: Type.STRING, description: "Detailed transport instruction: specific bus/train lines, walking directions, cost." },

                // Restaurant Options (Only for meals)
                restaurantOptions: {
                  type: Type.ARRAY,
                  description: "If type is breakfast/lunch/dinner, provide 3 top rated options nearby",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      cuisine: { type: Type.STRING },
                      rating: { type: Type.STRING, description: "e.g. 4.8/5" },
                      priceLevel: { type: Type.STRING, description: "$, $$, or $$$" },
                      description: { type: Type.STRING, description: "Why is it good? Signature dish?" }
                    },
                    required: ["name", "rating", "description", "priceLevel"]
                  }
                }
              },
              required: ["time", "title", "description", "type"],
            },
          },
        },
        required: ["day", "title", "activities"],
      },
    },
  },
  required: ["title", "description", "days", "tags", "budget"],
};

export const generateItinerary = async (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string = 'en'
): Promise<Itinerary> => {
  
  const langName = language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : language === 'zh-CN' ? 'Simplified Chinese (简体中文)' : 'English';

  const prompt = `
    You are an elite travel planner dedicated to creating highly personalized, "tailor-made" itineraries.
    
    DESTINATION: ${destination}
    DATES: ${startDate} to ${endDate}
    TRAVELER PREFERENCES: ${preferences.join(", ")}
    SPECIAL REQUESTS (CRITICAL): ${specialRequests || "None - surprise me but keep it logical"}
    
    TARGET LANGUAGE: ${langName}

    STRICT REQUIREMENTS:
    1. **Structure**: Generate a rich and full itinerary with **6-8 high-quality activities** per day PLUS meals. Ensure the day is well-filled but realistic.
    2. **Ordering**: The 'activities' array MUST be arranged in STRICT CHRONOLOGICAL ORDER. Do not group meals separately. Mix attractions and meals naturally by time (e.g., Breakfast -> Sightseeing -> Lunch -> Activity -> Dinner).
    3. **Tailor-Made**: The itinerary MUST be deeply customized based on the "Special Requests".
    4. **Detailed Content (攻略)**: For every activity, the 'description', 'tips', and 'transport' fields must be rich, practical, and informative.
       - 'description': Deep dive into what to do and why it's special.
       - 'tips': Expert advice (e.g., "Book 2 weeks in advance", "Visit the 3rd floor for the best view").
       - 'transport': Specific logistics (e.g., "Take the Yamanote Line to Shibuya Station, Exit 8").
    5. **Meals**: Provide 3 specific restaurant options for Breakfast, Lunch, and Dinner.
    6. **Language**: 
       - 'type' field MUST be in ENGLISH (e.g., 'Sightseeing'). 
       - All other user-facing text (title, descriptions, tips) MUST be in ${langName}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: itinerarySchema,
      },
    });

    let text = response.text || "{}";
    console.log("Gemini Response:", text);
    
    // Clean up markdown code blocks if present (Gemini sometimes wraps JSON in ```json ... ```)
    if (text.startsWith("```")) {
        text = text.replace(/^```json\s?/, "").replace(/^```\s?/, "").replace(/```$/, "");
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON:", e);
        // Attempt a simpler regex cleanup if parse failed
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                data = JSON.parse(jsonMatch[0]);
            } catch (e2) {
                 throw new Error("Invalid JSON response from AI");
            }
        } else {
            throw new Error("Invalid JSON response from AI");
        }
    }

    if (!data.days || !Array.isArray(data.days)) {
        throw new Error("Invalid itinerary structure: missing days");
    }

    // Augment with local data/ids
    const itinerary: Itinerary = {
      id: crypto.randomUUID(),
      title: data.title || `Trip to ${destination}`,
      location: destination,
      startDate,
      endDate,
      days: data.days.map((d: any) => ({
        ...d,
        date: "2024-01-01", // In a real app, calculate actual dates
        activities: (d.activities || []).map((a: any) => ({
            ...a,
            // Only generate image URL if we really need it, but prompt says "don't use images in list".
            // We keep it for data completeness but UI will hide it.
            imageUrl: a.imageKeyword ? getTravelImage(a.imageKeyword) : null
        }))
      })),
      coverImage: getTravelImage(destination + " scenic landscape"),
      tags: data.tags || [],
      likes: 0,
      author: {
        name: "AI Planner",
        avatar: "https://ui-avatars.com/api/?name=AI&background=ee8c2b&color=fff",
        role: "Assistant"
      },
      status: 'draft',
      budget: data.budget,
      rating: 5.0,
      description: data.description,
      generated: true
    };

    return itinerary;
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw new Error("Failed to generate itinerary. Please try again.");
  }
};