# THRiVE Option B — Split Apps

This separates the system into two clean apps.

## 1. Public Intake App

Use this file as:

src/App.jsx

from:

App_PUBLIC_INTAKE.jsx

Purpose:
- parent/player-facing
- only shows the intake form
- saves to evaluation_submissions
- source = public_intake_app

Suggested deployment:
- intake.thrivebasketball.org
- or thrivebasketball.org/intake

## 2. Coach System App

Use this file as:

src/App.jsx

from:

App_COACH_SYSTEM.jsx

Purpose:
- coach/internal dashboard
- Add Player
- New Evaluation
- Evaluation Command Center

Suggested deployment:
- coach.thrivebasketball.org
- or app.thrivebasketball.org

## Shared files

Both apps should keep:

src/supabase.js
src/styles.css
public/thrive-logo.png
.env.local

## Supabase tables needed

evaluation_submissions
players
evaluations

## Environment variables

Local .env.local:

VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY

Vercel:
Add the same two variables to each deployed app.
