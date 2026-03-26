# DINv2 Fresh Start

Clean reset for building the MVP in small, reviewable commits.

## Current scope
- API starter in `apps/api`
- Supabase migrations in `supabase/migrations`

## Run
1. Add `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. Install: `pnpm install`
3. Dev API: `pnpm dev`
4. Build API: `pnpm build`

## Suggested commit sequence
1. `chore: fresh reset and workspace scaffold`
2. `feat(db): add initial supabase migrations`
3. `feat(api): bootstrap fastify api health endpoint`
