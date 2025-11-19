# 🚀 FINAL SETUP STEPS

## You have: ✅
- Supabase URL: https://kjzpbpufphrirsjlzxua.supabase.co
- Database password: xE3rK)g.q7@2Edr
- OpenAI integration code (fully implemented!)

---

## Step 1: Get Supabase API Keys (2 minutes)

1. Go to: https://supabase.com/dashboard/project/kjzpbpufphrirsjlzxua/settings/api

2. Copy the **anon/public** key (starts with `eyJ...`)

3. Update your `.env` file:
   ```bash
   VITE_SUPABASE_ANON_KEY=eyJ...YOUR_KEY_HERE...
   ```

---

## Step 2: Run Database Migrations (5 minutes)

You need to run 3 migrations in order:

### Migration 1: Boards System
1. Go to: https://supabase.com/dashboard/project/kjzpbpufphrirsjlzxua/sql/new
2. Copy contents of: `supabase/migrations/003_boards_system.sql`
3. Paste and click **RUN**
4. ✅ Should see "Success"

### Migration 2: Board Templates
1. New query in SQL Editor
2. Copy contents of: `supabase/migrations/004_board_templates_seed.sql`
3. Paste and click **RUN**
4. ✅ Should see "Success"

### Migration 3: AI Integration
1. New query in SQL Editor
2. Copy contents of: `supabase/migrations/005_ai_integration.sql`
3. Paste and click **RUN**
4. ✅ Should see "Success"

**Verify tables created:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- boards
- board_steps
- board_executions
- board_templates
- ai_conversations
- ai_suggestions
- ai_usage_stats

---

## Step 3: Get OpenAI API Key (3 minutes)

1. Go to: https://platform.openai.com/api-keys

2. **Sign up/Login** with:
   - Google account, or
   - Email/password

3. Click **"+ Create new secret key"**

4. Name it: "Neurotype Planner"

5. Copy the key (starts with `sk-proj-...`)
   ⚠️ **SAVE IT NOW** - you can't see it again!

6. Update your `.env` file:
   ```bash
   VITE_OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
   ```

---

## Step 4: Update Supabase Service (1 minute)

Replace the stub in `src/services/supabase.ts` with:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Step 5: Start the App! 🎉

```powershell
npm run dev
```

The app should start on: http://localhost:3000

---

## Step 6: Test Everything (5 minutes)

### Test 1: Boards Feature
1. Click **"Boards"** in sidebar
2. Click **"Create Board"**
3. Choose board type and create
4. ✅ Should save to database

### Test 2: AI Assistant (MAIN NEW FEATURE!)
1. Click **"AI Assistant"** in sidebar (✨ second item)
2. Check status indicator - should be green "AI is ready"
3. Click **"General Chat"**
4. Type: "I have ADHD and need help with morning routines"
5. Press Enter
6. ✅ Should get AI response in 2-3 seconds

### Test 3: Board Suggestion
1. Back to mode selection
2. Click **"Create Routine Board"**
3. Type: "Create a 30-minute morning routine for someone with ADHD and low energy"
4. ✅ Should get JSON board suggestion

### Test 4: Crisis Detection
1. In any chat mode, type: "I feel hopeless"
2. ✅ Should see red crisis banner with 988 hotline

### Test 5: Rate Limiting
1. Make 20+ requests quickly
2. ✅ Should see rate limit error after 20

---

## Troubleshooting

### "Supabase client error"
**Fix:** Check that `VITE_SUPABASE_ANON_KEY` is set in `.env`

### "OpenAI client not initialized"
**Fix:** Check that `VITE_OPENAI_API_KEY` is set and starts with `sk-`

### "Failed to save conversation"
**Fix:** Run migration 005_ai_integration.sql

### "Network error" or timeouts
**Fix:** Check internet connection and OpenAI status: https://status.openai.com

### Tables don't exist
**Fix:** Run all 3 migrations in order (003, 004, 005)

---

## Your Complete `.env` Should Look Like:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://kjzpbpufphrirsjlzxua.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY...

# App Configuration
VITE_APP_NAME=Universal Neurotype Planner
VITE_APP_VERSION=0.1.0
VITE_ENVIRONMENT=development

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY
VITE_OPENAI_ORG_ID=

# AI Feature Configuration
VITE_AI_ENABLED=true
VITE_AI_MODEL=gpt-4-turbo-preview
VITE_AI_FALLBACK_MODEL=gpt-3.5-turbo
VITE_AI_MAX_TOKENS=2000
VITE_AI_TEMPERATURE=0.7
VITE_AI_CONTENT_FILTER=true
VITE_AI_CONTEXT_LIMIT=10
```

---

## Database Connection String

If you need direct database access:
```
postgresql://postgres:xE3rK)g.q7@2Edr@db.kjzpbpufphrirsjlzxua.supabase.co:5432/postgres
```

---

## What You Can Do After Setup

### AI Features (NEW!)
- Ask general neurodivergent life questions
- Generate complete routine boards with AI
- Break down overwhelming tasks into steps
- Analyze mood patterns
- Recover lost context ("where was I?")
- Design custom daily routines

### Existing Features
- Create visual boards manually
- Execute boards with timers
- Track board completion
- Share boards via share codes
- Save boards as templates
- Browse template library

---

## Cost Monitoring

### OpenAI Free Tier
- $5 in free credits
- ~100-200 conversations
- Check usage: https://platform.openai.com/usage

### App Rate Limits
- 20 requests/hour per user
- 100 requests/day per user
- Check in Supabase: `ai_usage_stats` table

---

## Next Steps After Testing

1. ✅ Verify all features work
2. 📱 Test on mobile (PWA installable!)
3. 🎨 Customize AI prompts in `src/config/aiConfig.ts`
4. 📊 Monitor usage in Supabase dashboard
5. 🚀 Deploy to production (Vercel/Netlify)

---

## Need Help?

- **Setup Guide:** `OPENAI_QUICKSTART.md`
- **Full Documentation:** `OPENAI_IMPLEMENTATION_COMPLETE.md`
- **Architecture:** `OPENAI_INTEGRATION_PLAN.md`

---

**You're almost there! Just need to:**
1. ✅ Get Supabase anon key
2. ✅ Run 3 database migrations  
3. ✅ Get OpenAI API key
4. ✅ Update supabase.ts
5. ✅ Start the app!

**Total time: ~15 minutes** 🎉
