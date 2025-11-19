import { serve } from 'std/server';

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // In a real implementation, exchange code or store apiKey and return connection record
    const mock = {
      id: crypto.randomUUID(),
      provider_id: body.providerId || 'unknown',
      connected: true,
      created_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(mock), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('task-integrations-connect error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
