import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // Return empty sync result; in production this would fetch from provider and transform
    const mock: any[] = [];
    return new Response(JSON.stringify(mock), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('task-integrations-sync error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
