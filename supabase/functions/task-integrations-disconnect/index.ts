import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // In real implementation, revoke tokens and remove stored connection
    return new Response(JSON.stringify({ ok: true, providerId: body.providerId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('task-integrations-disconnect error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
