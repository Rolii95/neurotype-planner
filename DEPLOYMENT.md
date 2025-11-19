Deployment & Environment

This document lists the environment variables, CI expectations, and reproducible deployment steps for Neurotype Planner.

Required env vars (runtime)
- `SUPABASE_URL`  Supabase project URL (e.g. `https://<project-ref>.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY`  Supabase service role key (used by server-side functions to access DB). Keep secret.
- `OPENAI_API_KEY`  OpenAI API key for `ai_proxy` runtime (stored as Supabase project secret / CI secret).

Required env vars (CI / deployment tooling)
- `SUPABASE_ACCESS_TOKEN`  Supabase CLI token (starts with `sbp_...`) used in CI to deploy functions and set secrets.
- `PROJECT_REF`  Supabase project ref used by CI scripts (e.g. `kjzpbpufphrirsjlzxua`).

Developer prerequisites
- Node.js 18+ (recommended 18.x LTS)
- npm (comes with Node.js)
- Supabase CLI (optional locally)  install via `npm i -g supabase` or use `npx supabase@latest`.
- Docker Desktop (only required for local Edge Function bundling if you prefer local deploys).

Local run (dev)
1. Copy `.env.example` -> `.env` and fill in `SUPABASE_URL` and local values.
2. Install dependencies: `npm ci`.
3. Start the app: `npm run dev`.

Run tests / build (reproducible)
1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

CI summary
- `.github/workflows/ci.yml` runs lint, tests, build, and uploads the build artifact. Supabase migrations are gated and will only run when `RUN_MIGRATIONS=true` is set in the environment or workflow.

Deploying Edge Functions & Runtime secrets (recommended CI flow)
1. Add `SUPABASE_ACCESS_TOKEN` (CLI token starting with `sbp_...`) to your repository secrets.
2. Add `OPENAI_API_KEY` to GitHub Actions secrets. The deploy workflow will set the same value as a Supabase project secret (so functions read it at runtime).
3. Use the provided GitHub Actions workflows to deploy functions and (optionally) run database migrations from CI. Avoid pushing runtime secrets to code or `.env` files.

Removing committed build artifacts
- `dist/` artifacts are ignored by `.gitignore`. If you find `dist/` already committed, remove them from the repo history and index; a one-off `git rm -r --cached dist` followed by a commit will remove tracked build artifacts from the tip of the branch.

Notes & best practices
- Do not store runtime secrets in the repository. Use repository or Supabase project secrets and the Supabase CLI in CI to inject them.
- Prefer `npx supabase@latest` in CI to avoid requiring global CLI installs on runners.
- For running migrations automatically, gate them behind an explicit env var to avoid accidental destructive changes from PRs.
