# OpenAI Integration - Quick Start Guide 🚀

## Step 1: Get Your OpenAI API Key (5 minutes)

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-proj-...`)
6. ⚠️ **Save it somewhere safe** - you can't see it again!

## Step 2: Configure Environment (2 minutes)

1. Open your `.env` file (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Add your OpenAI API key:
   ```bash
   # Your existing Supabase config stays the same
   VITE_SUPABASE_URL=https://kjzpbpufphrirsjlzxua.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   
   # NEW: Add these lines
   VITE_OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
   VITE_AI_ENABLED=true
   VITE_AI_MODEL=gpt-4-turbo-preview
   VITE_AI_FALLBACK_MODEL=gpt-3.5-turbo
   VITE_AI_MAX_TOKENS=2000
   VITE_AI_TEMPERATURE=0.7
   VITE_AI_CONTENT_FILTER=true
   VITE_AI_CONTEXT_LIMIT=10
   ```

3. Save the file

## Step 3: Run Database Migration (3 minutes)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Create a new query
5. Copy the contents of `supabase/migrations/005_ai_integration.sql`
6. Paste and click **Run**
7. ✅ Should see "Success. No rows returned"

This creates:
- `ai_conversations` table
- `ai_suggestions` table  
- `ai_usage_stats` table
- Rate limiting functions

## Step 4: Update Supabase Client (Optional - if using stub)

If you're still using the Supabase stub, update `src/services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Step 5: Start the App (1 minute)

```bash
npm run dev
```

The app will start on `http://localhost:3000`

## Step 6: Test It Out! (2 minutes)

1. **Navigate to AI Assistant:**
   - Click "AI Assistant" in the sidebar (✨ sparkles icon)
   - Should be second item, right after Dashboard

2. **Try General Chat:**
   - Click "General Chat"
   - Type: "I have ADHD and struggle with morning routines. Can you help?"
   - Press Enter or click Send
   - Wait 2-3 seconds for response

3. **Try Board Suggestion:**
   - Go back (click "← Back to modes")
   - Click "Create Routine Board"
   - Type: "Create a morning routine for someone with ADHD who has low energy in the morning"
   - The AI will generate a complete board suggestion!

4. **Test Crisis Detection:**
   - Type: "I feel hopeless"
   - Should see crisis resources banner with 988 hotline

## Troubleshooting

### Error: "OpenAI client not initialized"
**Fix:** Check that `VITE_OPENAI_API_KEY` is set in `.env` and starts with `sk-`

### Error: "Invalid API key"
**Fix:** Regenerate your API key at https://platform.openai.com/api-keys

### Error: "Rate limit exceeded"
**Fix:** You've hit your hourly limit (20 requests). Wait an hour or adjust `RATE_LIMITS` in `aiConfig.ts`

### Error: "Failed to save conversation"
**Fix:** Run the database migration (Step 3) - the tables might not exist

### No response after 30 seconds
**Fix:** 
1. Check your internet connection
2. Check OpenAI status: https://status.openai.com/
3. Look at browser console (F12) for errors

### AI says "not configured"
**Fix:** `VITE_AI_ENABLED` must be `true` in `.env` (not `"true"` with quotes, just `true`)

## Rate Limits & Costs

### Free Tier Limits
- **OpenAI:** $5 free credits (usually lasts ~100-200 conversations)
- **Our App Limits:**
  - 20 requests per hour per user
  - 100 requests per day per user

### Cost Tracking
- Check usage in Supabase: Query `ai_usage_summary` view
- Monitor OpenAI usage: https://platform.openai.com/usage

### Staying Within Budget
1. Use GPT-3.5 Turbo for testing (set `VITE_AI_MODEL=gpt-3.5-turbo`)
2. Reduce `VITE_AI_MAX_TOKENS` to 1000 for shorter responses
3. Set `VITE_AI_TEMPERATURE=0.5` for more deterministic (cheaper) responses

## Features to Try

### 1. General Chat
- "What are some ADHD-friendly task management strategies?"
- "How can I manage sensory overload?"
- "Tips for executive dysfunction?"

### 2. Create Routine Board
- "Morning routine for low energy days"
- "Evening wind-down routine for autism"
- "Work-from-home focus routine with ADHD"

### 3. Break Down Task
- "Help me break down 'clean the house'"
- "Break down 'write a report' into ADHD-friendly steps"
- "Make 'organize closet' less overwhelming"

### 4. Mood Patterns
- "I've been feeling anxious lately, especially in social situations"
- "My mood drops every Sunday evening. Why?"
- "I have more energy in the afternoon. Is that normal for ADHD?"

### 5. Where Was I? (Context Recall)
- "I was working on something but got distracted. Help me remember?"
- "I have 10 tabs open and can't remember why"
- "What was I doing before lunch?"

### 6. Design Routine
- "Create a daily routine that works with my ADHD time blindness"
- "Help me design a morning routine with sensory regulation"
- "Build a flexible work routine with hyperfocus sessions"

## Next Steps

1. **Test all 6 modes** - Each has unique prompts and behaviors
2. **Try board creation** - Generate a board and create it
3. **Check rate limiting** - Make 20 requests to see the limit message
4. **Review conversations** - Check Supabase `ai_conversations` table
5. **Monitor costs** - Check `ai_usage_stats` table after a day

## Advanced Configuration

### Use Cheaper Model for Testing
```bash
VITE_AI_MODEL=gpt-3.5-turbo  # ~10x cheaper than GPT-4
```

### Increase Rate Limits (Development Only)
Edit `src/config/aiConfig.ts`:
```typescript
export const RATE_LIMITS = {
  requestsPerHour: 100,  // was 20
  requestsPerDay: 500,   // was 100
  // ...
};
```

### Disable Content Filtering (Not Recommended)
```bash
VITE_AI_CONTENT_FILTER=false
```

### Add More Context (Longer Memory)
```bash
VITE_AI_CONTEXT_LIMIT=20  # was 10 (doubles memory, doubles cost)
```

## Support

- **Implementation Guide:** See `OPENAI_INTEGRATION_PLAN.md`
- **Complete Reference:** See `OPENAI_IMPLEMENTATION_COMPLETE.md`
- **OpenAI Docs:** https://platform.openai.com/docs
- **Supabase Docs:** https://supabase.com/docs

## Safety Reminders

⚠️ **This AI is NOT a replacement for professional mental health care**

✅ **It WILL:**
- Provide supportive, neurodivergent-aware assistance
- Help with task management and routines
- Offer coping strategies
- Validate your experiences

❌ **It WILL NOT:**
- Diagnose mental health conditions
- Prescribe medication
- Replace therapy or counseling
- Handle crisis situations (provides hotline resources instead)

**In crisis? Call 988 (Suicide & Crisis Lifeline) or your local emergency services.**

---

**You're all set! Enjoy your AI-powered neurodivergent support tool! 🧠✨**
