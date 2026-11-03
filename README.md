<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Itinerary AI

AI travel planner. The React app talks to Supabase (Postgres, RLS, Auth, Edge Functions). Itinerary generation runs in the `generate-itinerary` Edge Function, which calls the xAI API (`grok-4.7` by default). The browser never receives the model API key.

View your app in AI Studio: https://ai.studio/apps/drive/1cAIkHwx-1MeA7U07MKorhIKLtGr7CYMA

## Run Locally

**Prerequisites:** Node.js, a Supabase project

1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set the browser-safe Supabase values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Set the xAI key as a Supabase Edge Function secret. The function reads it with `Deno.env.get('XAI_API_KEY')` only.

   `supabase secrets set XAI_API_KEY=<your-xai-key>`

   Optional model override (default `grok-4.7`):

   `supabase secrets set XAI_MODEL=grok-4.7`

   Do not put `XAI_API_KEY` in `.env.local` or any `VITE_` variable.
4. Apply the database. For a project that already ran [supabase_schema.sql](supabase_schema.sql), apply [supabase/migrations/20261024120000_profile_fields.sql](supabase/migrations/20261024120000_profile_fields.sql). For a brand-new database, run the updated `supabase_schema.sql` (it already includes `profiles.username`, `bio`, and `banner_url`). On the live project (which already has `itinerary_comments` and the `on_like_change` trigger), also apply [supabase/migrations/20261103120000_community_mvp_rls.sql](supabase/migrations/20261103120000_community_mvp_rls.sql). That migration expects the live table names. It is not a bootstrap, and `supabase_schema.sql` still creates a `comments` table plus the removed like-counter RPCs.
5. Deploy the Edge Function:
   `supabase functions deploy generate-itinerary`
6. Run the app:
   `npm run dev`

Local function serving can read `XAI_API_KEY` from a gitignored `supabase/.env`. Do not commit that file.

## Community data contract

Publish, Explore, likes, saves, and comments are table access under RLS. Itinerary generation does not go through these tables.

- **Publish.** The owner updates `itineraries.is_public`. There is no publish RPC. Explore reads `is_public = true`, newest first.
- **Comments.** The table is `itinerary_comments`. The live database has no `comments` table.
- **Likes.** Insert or delete `itinerary_likes` (one row per user and itinerary). Trigger `on_like_change` runs `update_likes_count()`, and that trigger is the only writer of `itineraries.likes`. `increment_likes` and `decrement_likes` are removed. A client that inserts a like and then calls either RPC will double-count on an old database and get a missing-function error after this migration.
- **Saves.** Insert or delete `itinerary_saves`. Each user can read only their own saves.
- **Private trips.** Someone who does not own the itinerary cannot read its comments or likes, and cannot comment, like, or save it. The owner still can. Turning `is_public` off hides those interactions again.
