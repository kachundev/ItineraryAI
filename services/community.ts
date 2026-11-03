import { supabase } from '../lib/supabase';
import { attachProfiles, CommunityProfile, isPersistedItineraryId } from './communityContract';

export { isPersistedItineraryId };
export type { CommunityProfile };

export interface ItineraryComment {
  id: string;
  itinerary_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: CommunityProfile | null;
}

type CommentRow = Omit<ItineraryComment, 'profiles'>;

async function loadProfiles(userIds: string[]): Promise<CommunityProfile[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);
  if (error) throw error;
  return (data ?? []) as CommunityProfile[];
}

export async function loadItineraryComments(itineraryId: string): Promise<ItineraryComment[]> {
  const { data, error } = await supabase
    .from('itinerary_comments')
    .select('id, itinerary_id, user_id, content, created_at')
    .eq('itinerary_id', itineraryId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as CommentRow[];
  const profiles = await loadProfiles([...new Set(rows.map((row) => row.user_id))]);
  return attachProfiles(rows, profiles);
}

export async function createItineraryComment(
  itineraryId: string,
  userId: string,
  content: string,
): Promise<ItineraryComment> {
  const { data, error } = await supabase
    .from('itinerary_comments')
    .insert({ itinerary_id: itineraryId, user_id: userId, content })
    .select('id, itinerary_id, user_id, content, created_at')
    .single();
  if (error) throw error;
  const profiles = await loadProfiles([userId]);
  return attachProfiles([data as CommentRow], profiles)[0];
}

/** Inserts one like row. The database trigger updates itineraries.likes. */
export async function addItineraryLike(userId: string, itineraryId: string): Promise<void> {
  const { error } = await supabase
    .from('itinerary_likes')
    .insert({ user_id: userId, itinerary_id: itineraryId });
  if (error) throw error;
}

/** Deletes the caller's like row. Returns whether a row was removed. */
export async function removeItineraryLike(userId: string, itineraryId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('itinerary_likes')
    .delete()
    .match({ user_id: userId, itinerary_id: itineraryId })
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function addItinerarySave(userId: string, itineraryId: string): Promise<void> {
  const { error } = await supabase
    .from('itinerary_saves')
    .insert({ user_id: userId, itinerary_id: itineraryId });
  if (error) throw error;
}

export async function removeItinerarySave(userId: string, itineraryId: string): Promise<void> {
  const { error } = await supabase
    .from('itinerary_saves')
    .delete()
    .match({ user_id: userId, itinerary_id: itineraryId });
  if (error) throw error;
}

/**
 * Owner-only publish toggle. Updates `itineraries.is_public` and returns the
 * stored value. Throws when RLS changes no row (caller is not the owner).
 */
export async function setItineraryPublished(
  itineraryId: string,
  userId: string,
  isPublic: boolean,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('itineraries')
    .update({ is_public: isPublic })
    .eq('id', itineraryId)
    .eq('user_id', userId)
    .select('is_public')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error('Only the owner can change whether this itinerary is public.');
  }
  return Boolean(data.is_public);
}
