import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // Fake processing - decode base64 if provided and return a summary
    const fileName = body.fileName || 'uploaded-file';
    return new Response(JSON.stringify({ ok: true, fileName, processed: true, importedTasks: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('task-integrations-import-file error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
