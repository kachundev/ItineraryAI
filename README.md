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
4. Apply the database. For a project that already ran [supabase_schema.sql](supabase_schema.sql), apply [supabase/migrations/20261024120000_profile_fields.sql](supabase/migrations/20261024120000_profile_fields.sql). For a brand-new database, run the updated `supabase_schema.sql` (it already includes `profiles.username`, `bio`, and `banner_url`).
5. Deploy the Edge Function:
   `supabase functions deploy generate-itinerary`
6. Run the app:
   `npm run dev`

Local function serving can read `XAI_API_KEY` from a gitignored `supabase/.env`. Do not commit that file.
