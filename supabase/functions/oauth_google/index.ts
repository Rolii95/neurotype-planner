import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

serve(async (req) => {
  // Minimal stub for Google OAuth exchange
  // Expected flows: provider redirect -> callback
  try {
    const body = await req.json().catch(() => ({}));
    // In a real implementation, exchange `code` for tokens and persist them
    return new Response(JSON.stringify({ ok: true, message: 'google oauth stub', body }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('oauth_google error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
