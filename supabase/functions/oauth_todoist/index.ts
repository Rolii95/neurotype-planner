import { serve } from 'std/server';

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, message: 'todoist oauth stub', body }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('oauth_todoist error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
