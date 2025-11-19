import { serve } from 'std/server';

serve(async (req) => {
  try {
    // Accept webhook payload from external task import sources
    const body = await req.json().catch(() => ({}));

    // In real implementation: validate signature, transform payload, insert into tasks table
    console.log('task_import_webhook received', body);

    return new Response(JSON.stringify({ ok: true, message: 'task import received', body }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('task_import_webhook error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
