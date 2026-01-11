import { supabase } from "../lib/supabase";
import { Itinerary } from "../types";

export const generateItinerary = async (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string = 'en'
): Promise<Itinerary> => {
  const { data, error } = await supabase.functions.invoke('generate-itinerary', {
    body: {
      destination,
      startDate,
      endDate,
      preferences,
      specialRequests,
      language
    }
  });

  if (error) {
    console.error("Edge Function error:", error);
    // Try to get more details from the response body
    if (error.context?.body && error.context.body instanceof ReadableStream) {
      try {
        const reader = error.context.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
        console.error("Response body content:", result);
        const parsed = JSON.parse(result);
        if (parsed.error) {
          throw new Error(parsed.error + (parsed.details ? `: ${parsed.details}` : ''));
        }
      } catch (e) {
        console.error("Could not parse response body:", e);
      }
    }
    throw new Error(`Failed to generate itinerary: ${error.message}`);
  }

  console.log("Edge Function response:", data);

  // Handle case where response is an array (Gemini sometimes returns array)
  const responseData = Array.isArray(data) ? data[0] : data;

  if (responseData?.error) {
    console.error("API error from Edge Function:", responseData.error);
    throw new Error(responseData.error);
  }

  // Merge Gemini response with required Itinerary fields
  const itinerary: Itinerary = {
    id: `temp-${Date.now()}`, // Temporary ID until saved to DB
    title: responseData.title || `${destination} Trip`,
    location: destination,
    startDate: startDate,
    endDate: endDate,
    days: responseData.days || [],
    budget: responseData.budget || 'Medium',
    description: responseData.description || '',
    coverImage: undefined, // No cover image
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