# THRiVE Wix Webhook → Supabase

## File placement

Copy this file into your Vercel project:

api/wix-evaluation.js

## Required Vercel Environment Variables

Add these in Vercel → Project → Settings → Environment Variables:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WIX_WEBHOOK_SECRET

Then redeploy.

## Webhook URL

After deployment, your Wix webhook URL will be:

https://YOUR-VERCEL-DOMAIN.vercel.app/api/wix-evaluation

## Wix HTTP Request Settings

Method:
POST

Headers:
Content-Type: application/json
x-thrive-webhook-secret: YOUR_SECRET_VALUE

Body:
{
  "athlete_first_name": "{{athlete_first_name}}",
  "athlete_last_name_1": "{{athlete_last_name_1}}",
  "dropdown_90c5": "{{dropdown_90c5}}",
  "birth_year": "{{birth_year}}",
  "position": "{{position}}",
  "school": "{{school}}",
  "parent_first_name": "{{parent_first_name}}",
  "parent_last_name": "{{parent_last_name}}",
  "email_1a31": "{{email_1a31}}",
  "phone_7aeb": "{{phone_7aeb}}",
  "years_of_experience": "{{years_of_experience}}",
  "highest_level_played": "{{highest_level_played}}",
  "what_does_the_athlete_want_to_improve": "{{what_does_the_athlete_want_to_improve}}",
  "status": "new",
  "payment_status": "paid"
}

## Supabase Table Required

evaluation_submissions

Optional but recommended column:
source text default 'app'
