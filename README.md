<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/aed45ef9-3bd1-4e6e-8340-e9fa80839c9a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase Project Settings -> API.
3. Run [`src/lib/schema.sql`](src/lib/schema.sql) in the Supabase SQL Editor.
4. Enable Email in Authentication -> Providers. Enable Google only after configuring its OAuth credentials.
5. Add `http://localhost:3000` to Authentication -> URL Configuration while developing.

The browser uses only the public anon key. Never put `SUPABASE_SERVICE_ROLE_KEY` in client code or commit real secrets. Keep `GEMINI_API_KEY` server-side in `.env`.

## Deploy to Vercel

Import the repository into Vercel and keep the default Vite build settings. Add these Environment Variables in Vercel for Production (and Preview if needed):

- `GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After deployment, add the Vercel URL to Supabase Authentication -> URL Configuration and to Google OAuth Authorized JavaScript origins. Keep the Supabase callback URI as `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
