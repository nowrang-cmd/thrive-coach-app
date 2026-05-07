# THRiVE Supabase Locked Setup

## Files

Put this file here:

src/supabase.js

Create this file in the project root:

.env.local

## Local .env.local

VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY

## Supabase URL

Use the project ID from your browser URL.

Example:
https://supabase.com/dashboard/project/abcd1234/settings/api

Your Supabase URL is:
https://abcd1234.supabase.co

## Key

Use the Publishable key from Supabase API Keys.

Do not use the Secret key in the React app.

## Restart

After changing .env.local, run:

npm run dev

## Vercel

Add these to Vercel Environment Variables:

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

Then redeploy.

## Wix webhook / backend only

Use these only in the webhook backend:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WIX_WEBHOOK_SECRET
