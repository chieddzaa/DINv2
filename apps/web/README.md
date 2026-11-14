# DIN web app

Single-page web app for DIN. It has two modes:

- **Live:** real accounts through Supabase Auth. The profile, assessment, tasks and nudge log are saved in Postgres, protected by row-level security.
- **Demo:** the demo account, guided pitch tour and presenter controls run entirely in the browser and never touch the database.

## Setup
1. In Supabase, open the **SQL Editor** and run `supabase/migrations/005_web_mvp.sql`. It's safe to run on a fresh project or after 001–004.
2. Put the project URL and **anon (public)** key in `apps/web/config.js`. Never use the service_role key.
3. In Supabase, go to **Authentication → URL Configuration** and set the Site URL to the deployed address (e.g. `https://chieddzaa.github.io/DINv2/`).
4. Optional while testing: **Authentication → Sign In / Providers → Email**, turn off "Confirm email" so new accounts can start straight away.

## Deploy
Every push to `main` that touches `apps/web/` publishes to GitHub Pages (`.github/workflows/deploy-web.yml`). Turn it on once in **Settings → Pages → Source: GitHub Actions**.

## Run locally
```bash
cd apps/web && python3 -m http.server 8000   # open http://localhost:8000
```
