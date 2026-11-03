/**
 * Pure helpers for the community tables.
 *
 * Live names (do not query a `comments` table, and do not call like-count RPCs):
 *   itinerary_comments, itinerary_likes, itinerary_saves, itineraries.is_public
 * `itineraries.likes` is maintained by the database trigger on itinerary_likes.
 */

export interface CommunityProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Saved rows use a uuid primary key. Generated drafts use ids like `temp-…`. */
export function isPersistedItineraryId(id: string | null | undefined): id is string {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Comment authors live on `profiles`, but `itinerary_comments.user_id` references
 * `auth.users`, so PostgREST cannot embed profiles on that table.
 */
export function attachProfiles<T extends { user_id: string }>(
  rows: T[],
  profiles: CommunityProfile[],
): Array<T & { profiles: CommunityProfile | null }> {
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return rows.map((row) => ({
    ...row,
    profiles: byId.get(row.user_id) ?? null,
  }));
}
