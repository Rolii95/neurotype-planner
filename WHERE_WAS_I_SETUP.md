# "Where Was I?" Feature - Setup & Troubleshooting

## Quick Fix for Current Issues

### Problem: Chat window is empty, no auto-prompt sent

**Root Cause**: The `initialPrompt` is empty string, so the auto-send condition fails.

**Check Console**: Open browser DevTools and look for these logs:
```
🔍 WhereWasI modal opened, gathering context...
📊 Recent activities count: X
📝 Activity summary: ...
✉️ Setting initial prompt with activity data
```

If you see:
```
⚠️ No activity history, using fallback prompt
```

Then activity tracking is working but this is your first navigation.

If you DON'T see the WhereWasI logs at all, the modal isn't opening properly.

---

### Problem: OpenAI API Errors

#### Error 1: `404 The model gpt-4-turbo-preview does not exist`

**Fix**: Update your `.env` file (create it if it doesn't exist):

```bash
# Change this line in .env:
VITE_AI_MODEL=gpt-4o-mini

# Or use gpt-3.5-turbo for cheaper option:
VITE_AI_MODEL=gpt-3.5-turbo
```

**After changing .env**:
1. Stop the dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Hard refresh browser (Ctrl+Shift+R)

---

#### Error 2: `429 Too Many Requests` on moderation endpoint

**Fix Option 1** - Disable content moderation (faster, cheaper):
```bash
# Add to .env:
VITE_AI_CONTENT_FILTER=false
```

**Fix Option 2** - Use different API key with higher rate limits

---

## Activity Tracking Setup

Activity tracking has been added to the app. It will automatically log:
- ✅ Page navigations
- ✅ Time spent on each page  
- ✅ Page visibility changes

**To verify it's working**:
1. Open browser DevTools Console
2. Navigate between pages (Dashboard → Tasks → Routines)
3. Look for activity logs in AdaptiveSmartContext

---

## Testing the Feature

1. **Navigate around the app** for 30 seconds (Dashboard → Tasks → Focus → etc.)
2. **Click the AI bubble** (bottom-right corner)
3. **Check console logs** - should see:
   ```
   🔍 WhereWasI modal opened
   📊 Recent activities count: 5
   📝 Activity summary: ...
   ✉️ Setting initial prompt
   🤖 AIChat useEffect triggered
   ✅ Conditions met, sending initial prompt
   📤 Executing handleSend
   ```

4. **AI should automatically respond** with analysis of your recent activity

---

## Current Implementation Status

✅ **Completed**:
- ActivityTracker wraps entire app
- Activity logging on navigation
- WhereWasI modal with context banner
- Auto-prompt generation from activity history
- Fallback prompt if no history
- Plain text activity display

⚠️ **Known Issues**:
- Initial prompt might be empty on first load
- Browser cache may show old model errors
- Activity history empty until you navigate

🔧 **Quick Workarounds**:
- Navigate between pages before opening modal
- Hard refresh browser (Ctrl+Shift+R)
- Check .env file has correct AI model
- Verify VITE_OPENAI_API_KEY is set

---

## Environment Variables Reference

Create/update `.env` file in project root:

```bash
# Required for AI features
VITE_OPENAI_API_KEY=sk-your-actual-key-here

# Recommended settings
VITE_AI_ENABLED=true
VITE_AI_MODEL=gpt-4o-mini
VITE_AI_FALLBACK_MODEL=gpt-3.5-turbo
VITE_AI_CONTENT_FILTER=false
VITE_AI_MAX_TOKENS=2000
VITE_AI_TEMPERATURE=0.7
```

**After changing .env**: Always restart dev server and hard refresh browser!
