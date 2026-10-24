import { supabase } from "../lib/supabase";
import { Itinerary } from "../types";

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
    }
  });

  if (error) {
    console.error("Edge Function error:", error);
    const parsedMessage = await readInvokeError(error);
    throw new Error(parsedMessage || `Failed to generate itinerary: ${error.message}`);
  }

  return Array.isArray(data) ? data[0] : data;
};

async function readInvokeError(error: { context?: { body?: unknown } }): Promise<string | null> {
  const body = error.context?.body;
  if (!(body instanceof ReadableStream)) return null;

  try {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
    const parsed = JSON.parse(result);
    if (parsed?.error) {
      return String(parsed.error) + (parsed.details ? `: ${parsed.details}` : '');
    }
  } catch (e) {
    console.error("Could not parse response body:", e);
  }
  return null;
}

export const generateItinerary = async (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string = 'en'
): Promise<Itinerary> => {
  const responseData = await generateWithEdgeFunction(
    destination,
    startDate,
    endDate,
    preferences,
    specialRequests,
    language
  );

  if (responseData?.error) {
    console.error("API error:", responseData.error);
    throw new Error(responseData.error);
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
