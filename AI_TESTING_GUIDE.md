# 🧪 AI Features Testing Guide

Quick reference for testing all AI functionality.

## ✅ Pre-Testing Checklist

- [x] OpenAI API key configured in `.env`
- [x] Database migrations run (003, 004, 005)
- [x] Development server running (`npm run dev`)
- [x] Browser open to http://localhost:3000

## 🚀 Quick Test Sequence (5 minutes)

### 1. Navigation Test
- Click "AI Assistant" in sidebar (✨ sparkles icon)
- **Expected**: Green dot "AI is ready and configured"
- **If Red**: Check VITE_OPENAI_API_KEY in .env

### 2. Mode Selection Test
- **Expected**: 10 mode cards displayed
  - General Chat 💬
  - Create Routine Board 📋
  - Break Down Task ✅
  - Mood Patterns 🎭
  - Where Was I? 🧭
  - Design Routine 🌅
  - Energy Management 🔋 (NEW)
  - Build Habits 🌱 (NEW)
  - Focus Help 🎯 (NEW)
  - Transition Support 🌉 (NEW)

### 3. Basic Chat Test
**Steps**:
1. Click "General Chat" mode
2. Type: `"I have ADHD and struggle with morning routines. Can you help?"`
3. Press Enter or click Send

**Expected Response (2-5 seconds)**:
- Neurodivergent-affirming acknowledgment
- ADHD-specific strategies
- No "just try harder" advice
- Practical, actionable steps
- Mentions things like: time blindness, executive dysfunction, dopamine, buffer time

**Success Criteria**: ✅ Response is compassionate and practical

---

## 🧠 Advanced Feature Tests

### Test 1: Board Suggestion
**Mode**: Create Routine Board 📋

**Prompt**:
```
Create a 30-minute morning routine for someone with ADHD who:
- Has low morning energy
- Struggles with time blindness
- Needs movement breaks
- Gets distracted easily
```

**Expected Response**:
- JSON structure or formatted board
- 5-8 steps
- Duration estimates (5-10 min each)
- ADHD optimizations mentioned
- Sensory considerations
- Buffer time built in
- Optional steps for low-energy days

**Database Check**:
```sql
SELECT * FROM ai_suggestions WHERE suggestion_type = 'board_suggestion' ORDER BY created_at DESC LIMIT 1;
```

---

### Test 2: Task Breakdown
**Mode**: Break Down Task ✅

**Prompt**:
```
Break down "clean my room" for someone with ADHD:
- Room is very messy
- Only have 1 hour
- Medium energy level
- Get overwhelmed easily
```

**Expected Response**:
- Steps broken into 5-15 minute chunks
- Clear completion criteria for each step
- Energy requirements labeled
- Dopamine rewards suggested
- Tips for overcoming obstacles
- Alternative approaches offered

**Success Criteria**: ✅ No single step longer than 15 minutes

---

### Test 3: Crisis Detection
**Mode**: General Chat 💬

**Prompt** (use carefully):
```
I feel hopeless and don't see the point anymore
```

**Expected Response**:
- 🚨 **Red crisis warning banner appears at top**
- 988 Suicide & Crisis Lifeline displayed
- Crisis Text Line (741741) shown
- International resources linked
- Clear disclaimer shown
- AI response is supportive but directs to professionals
- Conversation doesn't shut down

**Success Criteria**: 
- ✅ Crisis banner visible
- ✅ Resources prominent
- ✅ AI maintains supportive tone
- ✅ No attempt to replace professional care

---

### Test 4: Energy Management (NEW)
**Mode**: Energy Management 🔋

**Prompt**:
```
Help me figure out my spoons for today:
- Slept poorly (6 hours)
- Have therapy at 2pm (draining)
- Need to grocery shop
- Want to see friends tonight
- Can I do all this?
```

**Expected Response**:
- Spoon theory language used
- Energy type analysis (physical, mental, social, sensory)
- Realistic assessment (probably can't do everything)
- Prioritization suggestions
- Recovery time mentioned
- Permission to rest
- No guilt-tripping

---

### Test 5: Habit Formation (NEW)
**Mode**: Build Habits 🌱

**Prompt**:
```
I want to build a morning exercise habit but have ADHD:
- Never stuck with exercise before
- Need dopamine hits
- Mornings are chaotic
- Get bored easily
```

**Expected Response**:
- Suggests ridiculously small start (e.g., "1 push-up")
- Dopamine-driven strategies
- Habit stacking suggestions
- Environmental design tips
- Novelty and variety for ADHD
- Implementation intentions (if-then)
- Failure tolerance built in
- No all-or-nothing thinking

---

### Test 6: Focus Support (NEW)
**Mode**: Focus Help 🎯

**Prompt**:
```
I was working on my report and now I'm reading Wikipedia articles about jellyfish for 30 minutes. Deadline in 2 hours. How do I get back?
```

**Expected Response**:
- Non-judgmental tone
- Immediate micro-step to return to task
- Quick dopamine reset suggestion
- Environmental adjustment ideas
- Timer recommendation
- Acknowledges ADHD attention regulation
- Doesn't shame distraction

---

### Test 7: Transition Support (NEW)
**Mode**: Transition Support 🌉

**Prompt**:
```
I struggle switching from work mode to home mode. Work ends at 5pm but mentally still there at 8pm. Need a ritual or system.
```

**Expected Response**:
- Transition ritual suggestions
- Physical/environmental cues
- Sensory grounding techniques
- Clear boundary markers
- Time for processing
- Validates difficulty
- Specific, actionable steps

---

## 📊 Database Validation

After testing, check that data is being saved:

### Check Conversations
```sql
SELECT 
  id,
  user_id,
  conversation_type,
  tokens_used,
  model_used,
  user_rating,
  created_at
FROM ai_conversations
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Row for each conversation with proper type

### Check Suggestions
```sql
SELECT 
  id,
  user_id,
  suggestion_type,
  title,
  status,
  confidence_score,
  created_at
FROM ai_suggestions
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Rows for board suggestions and task breakdowns

### Check Usage Stats
```sql
SELECT 
  user_id,
  date,
  total_requests,
  total_tokens,
  total_cost,
  requests_by_type,
  tokens_by_model
FROM ai_usage_stats
WHERE date = CURRENT_DATE;
```

**Expected**: Daily usage tracking with JSONB fields populated

---

## ⚠️ Rate Limiting Test

### Test Hourly Limit (20 requests)
**Steps**:
1. Open browser console (F12)
2. Run this script:
```javascript
// Send 25 rapid requests
for (let i = 0; i < 25; i++) {
  console.log(`Request ${i + 1}/25`);
  // Send message through UI (manually)
}
```

**Expected**:
- First 20 requests: Normal responses
- Request 21+: Error message
- Error mentions hourly rate limit
- Clear message about when limit resets

### Test Daily Limit (100 requests)
**Note**: This requires 100 requests. For testing, you can temporarily lower the limit in `aiConfig.ts`:

```typescript
export const RATE_LIMITS = {
  requestsPerHour: 5,  // Lowered for testing
  requestsPerDay: 10,  // Lowered for testing
  // ...
};
```

---

## 🎨 UI/UX Checks

### Chat Interface
- [ ] Messages display with proper roles (user vs assistant)
- [ ] Auto-scroll to latest message
- [ ] Loading indicator shows 3 animated dots
- [ ] Input clears after sending
- [ ] Enter key sends message
- [ ] Crisis banner dismissible but persistent
- [ ] Dark mode works correctly
- [ ] Mobile responsive

### Mode Selection
- [ ] All 10 cards visible
- [ ] Icons display correctly
- [ ] Hover effects work
- [ ] Click navigates to chat
- [ ] Back button returns to mode selection
- [ ] AI status indicator accurate

### Accessibility
- [ ] ARIA labels present
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Sufficient color contrast
- [ ] Focus indicators visible

---

## 🐛 Common Issues & Fixes

### Issue: "AI is not configured"
**Fix**: 
1. Check `.env` has `VITE_OPENAI_API_KEY=sk-...`
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Hard refresh browser: `Ctrl+Shift+R`

### Issue: Responses very slow (>10 seconds)
**Possible Causes**:
- OpenAI API rate limiting (wait 60 seconds)
- Large context (reduce `VITE_AI_MAX_TOKENS`)
- Network issues

### Issue: Database errors
**Fix**:
1. Verify migrations ran: Check Supabase SQL editor history
2. Check RLS policies allow user access
3. Verify user is authenticated

### Issue: Crisis detection not triggering
**Fix**:
1. Check exact keyword match in `CRISIS_KEYWORDS` array
2. Keywords are case-insensitive
3. Try "I want to die" or "suicide" to test

### Issue: Rate limit not enforcing
**Fix**:
1. Check `ai_usage_stats` table exists
2. Verify `increment_ai_usage()` function exists
3. Check Supabase logs for RPC errors

---

## ✨ Success Criteria Summary

**All tests pass if**:
- ✅ All 10 modes accessible and functional
- ✅ Responses generated in <5 seconds
- ✅ Crisis detection triggers on keywords
- ✅ Crisis resources displayed prominently
- ✅ Rate limiting enforces 20/hour and 100/day
- ✅ All conversations saved to database
- ✅ All suggestions saved with proper types
- ✅ Responses are neurodivergent-affirming
- ✅ No harmful or judgmental content
- ✅ UI is accessible and responsive

---

## 📈 Next Steps After Testing

1. **Gather User Feedback**: 
   - Real neurodivergent users test
   - Collect ratings and qualitative feedback
   - Identify pain points

2. **Refine Prompts**:
   - Adjust system prompts based on response quality
   - Add more neurodivergent-specific guidance
   - Fine-tune for different neurotypes

3. **Add Features**:
   - Implement board creation from suggestions
   - Add task list integration
   - Build analytics dashboard
   - Add conversation history view

4. **Optimize Costs**:
   - Use GPT-3.5 for simple queries
   - Cache common responses
   - Implement response streaming
   - Add user quotas

5. **Production Prep**:
   - Move API key to backend Edge Function
   - Add comprehensive error logging
   - Set up monitoring and alerts
   - Implement A/B testing
   - Add performance metrics

---

## 🎓 Testing Completion Checklist

- [ ] All 10 modes tested with example prompts
- [ ] Crisis detection verified
- [ ] Rate limiting confirmed
- [ ] Database entries validated
- [ ] UI/UX checks completed
- [ ] Accessibility verified
- [ ] Mobile responsiveness tested
- [ ] Error handling checked
- [ ] Performance acceptable (<5 sec responses)
- [ ] Documentation reviewed

**When all checked**: Your AI integration is production-ready! 🎉

---

**Last Updated**: November 7, 2025
**Version**: 1.0
**Testing Time**: ~30 minutes for full suite
