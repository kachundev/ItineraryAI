import { supabase } from "../lib/supabase";
import { Itinerary } from "../types";
import {
  GENERATE_MESSAGES,
  GenerateItineraryError,
  failureFromPayload,
  readInvokeFailure,
  resolveGenerateFailure,
  startClientAbort,
} from "./generateErrors";

const generateWithEdgeFunction = async (
  destination: string,
  startDate: string,
  endDate: string,
  preferences: string[],
  specialRequests: string,
  language: string
) => {
  // functions.invoke in @supabase/functions-js@2.90.0 accepts `signal` and `timeout`.
  // Pass the AbortSignal so this client, not the library timeout option, owns the 45s deadline.
  const abort = startClientAbort();
  try {
    const { data, error } = await supabase.functions.invoke('generate-itinerary', {
      body: {
        destination,
        startDate,
        endDate,
        preferences,
        specialRequests,
        language
      },
      signal: abort.signal,
    });

    if (abort.signal.aborted || error) {
      const aborted = abort.signal.aborted;
      console.error("Edge Function error:", error);
      const failure = error
        ? await readInvokeFailure(error)
        : { code: null, detail: null, status: null };
      const resolved = resolveGenerateFailure({
        aborted,
        code: failure.code,
        detail: failure.detail,
      });
      throw new GenerateItineraryError(resolved.code, resolved.message);
    }

    return Array.isArray(data) ? data[0] : data;
  } finally {
    abort.finish();
  }
};

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

  const payloadError = failureFromPayload(responseData);
  if (payloadError) {
    console.error("API error:", payloadError.detail);
    const resolved = resolveGenerateFailure({
      aborted: false,
      code: payloadError.code,
      detail: payloadError.detail,
    });
    throw new GenerateItineraryError(resolved.code, resolved.message);
  }

  if (!responseData || typeof responseData !== 'object') {
    throw new GenerateItineraryError('parse_error', GENERATE_MESSAGES.parse_error);
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
