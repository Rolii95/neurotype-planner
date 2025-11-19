import { serve } from 'std/server';

// Deno types may not be available to TypeScript in this workspace linting environment.
declare const Deno: any;

/**
 * ai_proxy - Production-ready Supabase Edge Function
 * - Performs optional moderation checks
 * - Calls OpenAI Chat Completions server-side
 * - Optionally persists conversations to Supabase when service role key is provided
 * - Optional auth: can validate Authorization bearer token against Supabase /auth/v1/user
 *
 * Required environment vars for production behavior:
 * - OPENAI_API_KEY: string (OpenAI server API key)
 * - SUPABASE_URL: string (your Supabase URL)
 * - SUPABASE_SERVICE_ROLE_KEY: string (service role key to persist conversations)
 *
 * Deploy with: `supabase functions deploy ai_proxy`
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

async function fetchSupabaseUser(accessToken: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('Failed to validate supabase user', err);
    return null;
  }
}

async function persistConversationToSupabase(payload: any) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('Failed to persist conversation', text);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('Persist conversation error', err);
    return null;
  }
}

serve(async (req: any) => {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'chat';
    const conversationId = body?.conversationId || crypto.randomUUID();

    // Optional: validate user via Supabase access token (if provided)
    const authHeader = req.headers.get('authorization') || '';
    let supabaseUser: any = null;
    if (authHeader && authHeader.startsWith('Bearer ') && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const token = authHeader.replace('Bearer ', '');
      supabaseUser = await fetchSupabaseUser(token);
    }

    // Moderation-only action
    if (action === 'moderation') {
      if (!OPENAI_API_KEY) return new Response(JSON.stringify({ error: 'no_openai_key' }), { status: 500 });
      const userMessage = body.userMessage || '';
      const modRes = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ input: userMessage }),
      });
      const modJson = await modRes.json();
      return new Response(JSON.stringify({ flagged: modJson?.results?.[0]?.flagged ?? false, details: modJson }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Chat/completion flow
    if (action === 'chat') {
      if (!OPENAI_API_KEY) {
        // Fallback mock response when not configured
        return new Response(JSON.stringify({ content: '[AI proxy mock] OpenAI key not configured', tokens: 0, model: 'mock' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      const messages = Array.isArray(body.messages) ? body.messages : [{ role: 'system', content: body.systemPrompt || '' }, { role: 'user', content: body.userMessage || '' }];
      const model = body.model || 'gpt-4o-mini';

      // Perform moderation server-side for the user's input (best-effort)
      try {
        const modRes = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({ input: body.userMessage || '' }),
        });
        const modJson = await modRes.json();
        const flagged = modJson?.results?.[0]?.flagged ?? false;
        if (flagged) return new Response(JSON.stringify({ error: 'content_flagged' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        console.warn('Moderation failed, continuing to chat', err);
      }

      // Call OpenAI Chat Completions
      const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model, messages, temperature: body.temperature ?? 0.7, max_tokens: body.max_tokens ?? 1000, top_p: 1 }),
      });

      const chatJson = await chatRes.json();
      const assistantMessage = chatJson?.choices?.[0]?.message?.content ?? '';
      const tokensUsed = chatJson?.usage?.total_tokens ?? 0;

      // Optionally persist conversation (if service role key available)
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const convoPayload = {
          id: conversationId,
          user_id: supabaseUser?.id || null,
          conversation_type: body.conversationType || 'general',
          context_data: body.contextData || null,
          messages: messages.concat([{ role: 'assistant', content: assistantMessage }]),
          tokens_used: tokensUsed,
          model_used: model,
          last_message_at: new Date().toISOString(),
        };
        void persistConversationToSupabase(convoPayload);
      }

      return new Response(JSON.stringify({ content: assistantMessage, tokens: tokensUsed, model, conversationId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'unknown_action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('ai_proxy error', error);
    return new Response(JSON.stringify({ error: 'internal_error', details: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
