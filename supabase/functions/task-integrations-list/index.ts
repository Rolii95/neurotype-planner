import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

serve(async (req) => {
  try {
    // Return a mocked empty connections list for now
    const mock: any[] = [];
    return new Response(JSON.stringify(mock), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('task-integrations-list error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
