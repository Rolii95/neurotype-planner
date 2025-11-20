// Supabase Edge Function (Deno) to accept client metrics snapshots
// This is a template; deploy with `supabase functions deploy receive-metrics`.

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

// Expect environment variables: SUPABASE_URL or METRICS_SUPABASE_URL,
// and SUPABASE_SERVICE_ROLE_KEY or METRICS_SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('METRICS_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('METRICS_SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE_URL or SERVICE_ROLE_KEY for metrics function');
}

const supabase = createClient(String(SUPABASE_URL || ''), String(SUPABASE_SERVICE_ROLE_KEY || ''), { auth: { persistSession: false } });

// In-memory rate limit per IP (best-effort). For production, consider external store.
const rateMap = new Map<string, { windowStart: number; count: number }>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 120; // max requests per IP per window

// Request size limits
const MAX_CONTENT_LENGTH_BYTES = 64 * 1024; // 64 KB

// Non-blocking rejection logger: writes a structured log to console and attempts
// to insert a small record into `app_metrics_rejections` (best-effort). If the
// table doesn't exist or insert fails, we swallow the error to avoid breaking
// the main request path.
async function logRejection({ ip, reason, userId, contentLength, note }: { ip: string; reason: string; userId?: string | null; contentLength?: number | null; note?: any }) {
  try {
    const payload = { ip, reason, user_id: userId || null, content_length: contentLength || null, note: typeof note === 'object' ? JSON.stringify(note) : String(note || '') , created_at: new Date().toISOString() };
    // Structured console log (captured by platform logs)
    console.warn('metrics rejection', payload);

    // Best-effort insert into a lightweight table for aggregated monitoring.
    // This is optional — if the table isn't present, ignore the error.
    if (supabase) {
      supabase.from('app_metrics_rejections').insert(payload).then(() => {
        // no-op
      }).catch((e: any) => {
        // don't escalate; platform logs already have the console.warn
        console.debug('rejection log insert failed', e?.message || e);
      });
    }
  } catch (e) {
    // swallow any logging errors
    console.debug('logRejection failed', e);
  }
}

serve(async (req: Request) => {
  try {
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();

    // content-length based early rejection
    const contentLength = req.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_CONTENT_LENGTH_BYTES) {
      // Log rejection (best-effort)
      logRejection({ ip, reason: 'payload_too_large', userId: null, contentLength: Number(contentLength), note: 'content-length header exceeded' });
      return new Response(JSON.stringify({ error: 'payload_too_large' }), { status: 413 });
    }

    // defensive body read with size cap
    let payload = null;
    try {
      const reader = req.body?.getReader && req.body.getReader();
      if (reader) {
        // If streaming body exists, read up to limit
        let received = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.length;
              if (received > MAX_CONTENT_LENGTH_BYTES) {
                // Log streaming rejection
                logRejection({ ip, reason: 'payload_too_large', userId: null, contentLength: received, note: 'streaming body exceeded max allowed' });
                return new Response(JSON.stringify({ error: 'payload_too_large' }), { status: 413 });
              }
          chunks.push(value);
        }
        const all = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
        let offset = 0;
        for (const c of chunks) {
          all.set(c, offset);
          offset += c.length;
        }
        payload = JSON.parse(new TextDecoder().decode(all));
      } else {
        payload = await req.json().catch(() => null);
      }
    } catch (e) {
      console.warn('payload parse error', e);
      logRejection({ ip, reason: 'invalid_payload', userId: null, contentLength: contentLength ? Number(contentLength) : null, note: (e as any)?.message || String(e) });
      return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400 });
    }
    if (!payload || !payload.metrics) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400 });
    }

    // opt-in enforcement: if client includes user_id null and no auth, allow but mark anonymous
    const userId = payload.user_id || null;

    // validate basic shape (metrics should be an object)
    if (typeof payload.metrics !== 'object') {
      return new Response(JSON.stringify({ error: 'invalid_metrics' }), { status: 400 });
    }

    // check rate limits
    const now = Date.now();
    const existing = rateMap.get(ip) || { windowStart: now, count: 0 };
    if (now - existing.windowStart > WINDOW_MS) {
      existing.windowStart = now;
      existing.count = 0;
    }
    if (existing.count >= MAX_PER_WINDOW) {
      // Log rate-limited event (non-blocking)
      logRejection({ ip, reason: 'rate_limited', userId: userId || null, contentLength: contentLength ? Number(contentLength) : null, note: `max ${MAX_PER_WINDOW} per ${WINDOW_MS}ms` });
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
    }

    // insert into app_metrics
    const insert = await supabase.from('app_metrics').insert({ user_id: userId, metrics: payload.metrics, source: 'edge' });
    if (insert.error) {
      console.error('db insert failed', insert.error);

      // Hardened behavior: do NOT attempt DDL at runtime. Surface a clear, actionable error
      // so ops can run migrations and/or enable the RPC if they intend to use the development
      // fallback. This prevents clients from creating schema during normal runtime.
      const errMsg = String(insert.error.message || '').toLowerCase();
      if (errMsg.includes('does not exist') || (errMsg.includes('relation') && errMsg.includes('does not exist'))) {
        const guidance = {
          error: 'app_metrics_missing',
          message: 'The `app_metrics` table (or required views) does not exist in the database.',
          action: 'Run migrations: `npx supabase db push` (ensure migrations in supabase/migrations are applied).',
          optional_dev_fallback: 'If you rely on the development fallback, ensure the `run_sql` RPC is installed (see `supabase/migrations/20251120_add_run_sql_rpc.sql`) and re-run migrations, then redeploy the Edge Function.',
          docs: 'See repository supabase/migrations and README for migration & deployment steps.'
        };
        return new Response(JSON.stringify(guidance), { status: 503 });
      }

      return new Response(JSON.stringify({ error: 'db_error', details: insert.error.message }), { status: 500 });
    }

    // update rate map
    existing.count = existing.count + 1;
    rateMap.set(ip, existing);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('function error', err);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
});
