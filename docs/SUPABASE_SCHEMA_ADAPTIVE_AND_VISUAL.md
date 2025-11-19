Adaptive Smart & Visual Sensory — Supabase schema and syncing notes

Overview

This document describes the recommended Supabase/Postgres tables, columns, and syncing logic used by the Adaptive Smart and Visual Sensory features. The repo code now prefers Supabase where available and falls back to localStorage in demo mode.

Guiding principles
- Keep per-user data isolated with `user_id` columns and Row Level Security (RLS).
- Use small, focused RPC/Edge Functions for CPU-heavy or AI-backed processing (e.g., quick-entry NLP).
- Prefer `insert`/`upsert` semantics for profile/preferences to avoid relying on DB triggers that may be blocked by RLS.

Suggested table schemas

1) adaptive_activities
- Purpose: store low-level user activity events used to derive sessions and signals.
- Columns:
  - id: uuid (primary key, default: gen_random_uuid())
  - user_id: uuid (references users)
  - activity_type: text
  - entity_id: text (nullable)
  - entity_type: text (nullable)
  - duration_minutes: integer (nullable)
  - context: jsonb (nullable) — structured context like page, component, event metadata
  - timestamp: timestamptz (default: now())

Indexes:
- (user_id, timestamp desc)

RLS:
- policy allowing authenticated user to insert/select where user_id = auth.uid()

2) adaptive_suggestions
- Purpose: server/persisted suggestions surfaced to the user (adaptive advice, reminders).
- Columns:
  - id: uuid
  - user_id: uuid
  - type: text
  - title: text
  - message: text
  - priority: text
  - confidence: numeric
  - context: jsonb
  - actions: jsonb (array of action objects)
  - created_at: timestamptz
  - expires_at: timestamptz (nullable)
  - status: text ('pending' | 'accepted' | 'dismissed')

Indexes:
- (user_id, status, created_at desc)

RLS:
- allow insert/select/update where user_id = auth.uid(); limit update to status changes from the owner

3) adaptive_quick_entries
- Purpose: store user quick-capture entries awaiting processing
- Columns:
  - id: uuid
  - user_id: uuid
  - content: text
  - metadata: jsonb
  - created_at: timestamptz
  - processed: boolean

RLS: owner-only select/insert/update (user_id = auth.uid())

4) visual_routines
- Purpose: store visual routine definitions and steps
- Columns:
  - id: uuid
  - user_id: uuid
  - title: text
  - steps: jsonb (ordered array of step objects with labels, images, durations)
  - created_at, updated_at: timestamptz

RLS: owner-only

5) mood_entries
- Purpose: store mood & energy check-ins
- Columns:
  - id: uuid
  - user_id: uuid
  - mood: integer
  - energy: integer
  - context: jsonb
  - tags: text[]
  - timestamp: timestamptz

RLS: owner-only

6) sensory_preferences
- Purpose: per-user sensory UI preferences
- Columns:
  - id: uuid
  - user_id: uuid (unique)
  - preferences: jsonb
  - timestamp: timestamptz
  - updated_at: timestamptz

RLS: owner-only upsert (user may upsert their preferences)

Edge functions / RPC
- process_quick_entry (Edge Function or RPC): takes `entryId` and runs server-side NLP/AI model to produce a processed object (intent/entities) and optionally creates a task. This avoids exposing AI keys on client.
- health_check (optional RPC): lightweight health probe for CI

Syncing and offline considerations
- Demo mode: code falls back to localStorage (keys used previously: `adaptiveSmart_activities`, `adaptiveSmart_suggestions`, `adaptiveSmart_quickEntries`, `vs-routines`, `vs-mood-entries`, `vs-sensory-preferences`). This is purely dev/demo.
- Offline queue: `supabaseService` includes an offline activity queue flush mechanism. For other writes (routines, mood entries), consider queuing writes for retry on `online` events.
- RLS notes: when enabling RLS, ensure any server-side processes that need to create rows (e.g., welcome profiles) either run as a service-role (secure server-side) or are designed to upsert from the client with the authenticated user's session. Avoid client-side secret usage.

Migration guidance
- Create tables and policies for each table above.
- Add indexes for heavy-read paths (user_id + time).
- Deploy Edge Functions for CPU-bound processing (NLP, enrichment).

Security checklist before shipping
- Ensure RLS policies are in place and tested for each table.
- Verify Edge Functions are authenticated and validate input.
- Confirm storage buckets have appropriate public/private policies; prefer signed URLs for private assets.
- Remove any remaining demo-mode fallbacks in CI/CD / production builds.

Examples (select)
- Fetch today’s mood entries:
  SELECT * FROM mood_entries WHERE user_id = auth.uid() AND date_trunc('day', timestamp) = current_date;

- Insert a quick entry in an Edge Function (server-side):
  INSERT INTO adaptive_quick_entries (user_id, content, metadata, created_at) VALUES (user_id, content, metadata, now());

Notes
- The codebase now attempts Supabase operations and falls back to localStorage when Supabase is not configured (demo mode). For production, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and remove or ignore demo fallbacks as needed.

