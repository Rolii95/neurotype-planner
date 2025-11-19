# 🎯 AI Features - Quick Reference Card

**Status**: ✅ LIVE and READY  
**URL**: http://localhost:3000/ai-assistant  
**Your API Key**: Configured in `.env`

---

## 🚀 Quick Start

1. Click "AI Assistant" in sidebar (✨ sparkles icon)
2. Look for green dot = "AI is ready"
3. Choose a mode
4. Start chatting!

---

## 💬 10 Available Modes

| Icon | Mode | Use When... |
|------|------|-------------|
| 💬 | **General Chat** | You need general support |
| 📋 | **Create Routine Board** | You want AI to design a visual board |
| ✅ | **Break Down Task** | Task feels overwhelming |
| 🎭 | **Mood Patterns** | You want to understand your moods |
| 🧭 | **Where Was I?** | You lost context/forgot what you were doing |
| 🌅 | **Design Routine** | You need a personalized daily routine |
| 🔋 | **Energy Management** | You need to assess/manage your spoons |
| 🌱 | **Build Habits** | You want to create sustainable habits |
| 🎯 | **Focus Help** | You're distracted or can't start |
| 🌉 | **Transition Support** | You're struggling to switch tasks |

---

## ⚡ Example Prompts (Copy & Paste)

### General Chat 💬
```
I have ADHD and keep losing my keys. Any systems that actually work?
```

### Energy Management 🔋
```
Help me assess my spoons for today. I slept poorly and have 3 meetings.
```

### Break Down Task ✅
```
Clean my room. 1 hour available. Feeling overwhelmed.
```

### Focus Help 🎯
```
I was working on my report but now I'm reading Wikipedia for 30 minutes. Help!
```

### Build Habits 🌱
```
I want to exercise daily but have ADHD and never stick with it.
```

### Transition Support 🌉
```
I can't switch from work mode to home mode. Still thinking about work at 8pm.
```

---

## 🛡️ Safety Features

**Crisis Detection**: Type keywords like "hopeless" → Get 988 resources immediately

**Rate Limits**: 
- 20 requests per hour
- 100 requests per day
- Automatic reset

**Content Moderation**: OpenAI filters harmful content

---

## 📊 Check Your Usage

**Supabase Dashboard**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. SQL Editor → Run:
```sql
SELECT * FROM ai_usage_stats WHERE date = CURRENT_DATE;
```

**OpenAI Dashboard**:
- https://platform.openai.com/usage
- Monitor costs in real-time

---

## 🧪 Quick Test Checklist

- [ ] Green dot shows on AI Assistant page
- [ ] Can send message in General Chat
- [ ] Response arrives in <5 seconds
- [ ] Response is neurodivergent-affirming
- [ ] Try at least 3 different modes
- [ ] Crisis detection works (test with "I feel hopeless")

---

## 🐛 Troubleshooting

**"AI is not configured" (red dot)**:
1. Check `.env` has `VITE_OPENAI_API_KEY=sk-...`
2. Restart server: `Ctrl+C` then `npm run dev`
3. Hard refresh: `Ctrl+Shift+R`

**Slow responses (>10 sec)**:
- OpenAI rate limiting (wait 60 seconds)
- Try GPT-3.5 instead (change `VITE_AI_MODEL` in `.env`)

**Database errors**:
- Verify migrations ran in Supabase
- Check you're logged in

---

## 📚 Full Documentation

- **Testing**: `AI_TESTING_GUIDE.md`
- **Examples**: `AI_EXAMPLE_PROMPTS.md`
- **Summary**: `AI_IMPLEMENTATION_SUMMARY.md`
- **Setup**: `SETUP_CHECKLIST.md`

---

## 💡 Pro Tips

1. **Be specific**: More context = better suggestions
2. **Mention energy**: "low energy" gets different advice than "high energy"
3. **State neurotype**: "I have ADHD" tailors the response
4. **Use sensory details**: "sensitive to sounds" adds relevant considerations
5. **Ask for alternatives**: AI always provides options

---

## 🎯 What Makes This Special

✅ **Neurodivergent-first**: No "just try harder" advice  
✅ **Validates experiences**: Acknowledges time blindness, executive dysfunction, masking  
✅ **Practical**: Actionable micro-steps, not vague suggestions  
✅ **Flexible**: Energy-appropriate, multiple alternatives  
✅ **Safe**: Crisis detection, professional disclaimers  
✅ **Private**: Your data, your database, Row Level Security

---

## 🚀 Ready to Go!

Your AI assistant is **live and fully functional**. 

Start with General Chat to get comfortable, then explore the specialized modes!

**Remember**: This is a support tool, not a replacement for professional care. It's here to help you work *with* your neurodivergent brain, not against it. 💙

---

**Quick Access**: http://localhost:3000/ai-assistant
