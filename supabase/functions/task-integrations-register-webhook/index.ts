import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const mock = {
      id: crypto.randomUUID(),
      provider_id: body.providerId || 'unknown',
      callback_url: body.callbackUrl,
      registered: true,
    };
    return new Response(JSON.stringify(mock), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('task-integrations-register-webhook error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
