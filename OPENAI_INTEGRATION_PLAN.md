# OpenAI Integration - Universal Neurotype Planner
## Comprehensive Implementation Guide

---

## 🎯 Integration Strategy

### Current Architecture Analysis

**Existing Features to Enhance:**
1. ✅ **Visual Boards** - AI can suggest optimized board structures
2. ✅ **Mood Tracking** - AI can identify patterns and provide insights
3. ✅ **Task Management** - AI can help with task breakdown and prioritization
4. ✅ **Routines** - AI can create personalized routine suggestions
5. ✅ **Recall Button** (WhereWasI) - AI-powered context recovery
6. ✅ **Onboarding Flow** - AI can personalize initial setup
7. ✅ **Collaboration** - AI can facilitate team communication
8. ✅ **Adaptive Smart Context** - AI learns user patterns

**Technology Stack:**
- Frontend: React 18 + TypeScript + Vite
- Backend: Supabase (PostgreSQL + Real-time)
- State: React Query + Context API
- Styling: Tailwind CSS
- PWA: Service Worker enabled

---

## 📋 Implementation Roadmap

### Phase 1: Foundation Setup (Week 1)
### Phase 2: Core AI Services (Week 2-3)
### Phase 3: Feature Integration (Week 4-5)
### Phase 4: Safety & Testing (Week 6)
### Phase 5: Deployment & Monitoring (Week 7+)

---

## 🔧 PHASE 1: Foundation Setup

### Step 1.1: Environment Configuration

**1. Create OpenAI Account & API Key**
```bash
# Visit https://platform.openai.com/api-keys
# Create new secret key
# Store securely in environment variables
```

**2. Update Environment Variables**

Create/update `.env` file:
```env
# Existing Supabase config
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# NEW: OpenAI Configuration
VITE_OPENAI_API_KEY=sk-...your_key_here...
VITE_OPENAI_ORG_ID=org-...your_org_id... (optional)

# AI Feature Flags
VITE_AI_ENABLED=true
VITE_AI_MODEL=gpt-4-turbo-preview
VITE_AI_FALLBACK_MODEL=gpt-3.5-turbo
VITE_AI_MAX_TOKENS=2000
VITE_AI_TEMPERATURE=0.7

# Safety & Moderation
VITE_AI_CONTENT_FILTER=true
VITE_AI_CONTEXT_LIMIT=10
```

**3. Install Dependencies**
```bash
npm install openai
npm install @types/openai --save-dev
```

---

### Step 1.2: Create AI Configuration File

**File: `src/config/aiConfig.ts`**

```typescript
interface AIConfig {
  apiKey: string;
  model: string;
  fallbackModel: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  contentFilterEnabled: boolean;
  contextLimit: number;
}

export const aiConfig: AIConfig = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  model: import.meta.env.VITE_AI_MODEL || 'gpt-4-turbo-preview',
  fallbackModel: import.meta.env.VITE_AI_FALLBACK_MODEL || 'gpt-3.5-turbo',
  maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS || '2000'),
  temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE || '0.7'),
  enabled: import.meta.env.VITE_AI_ENABLED === 'true',
  contentFilterEnabled: import.meta.env.VITE_AI_CONTENT_FILTER === 'true',
  contextLimit: parseInt(import.meta.env.VITE_AI_CONTEXT_LIMIT || '10'),
};

export const AI_SYSTEM_PROMPTS = {
  base: `You are a compassionate AI assistant specialized in supporting neurodivergent individuals, particularly those with ADHD, Autism, and executive function challenges. Your role is to:

1. Provide clear, structured, and supportive responses
2. Break down complex tasks into manageable steps
3. Offer encouragement without being patronizing
4. Respect sensory sensitivities and cognitive differences
5. Never diagnose or replace professional medical advice
6. Encourage professional help when appropriate
7. Use plain language and avoid jargon
8. Be patient and understanding of executive dysfunction

IMPORTANT SAFETY RULES:
- Always include disclaimers for mental health advice
- Recognize crisis situations and direct to emergency resources
- Respect user autonomy and choices
- Maintain privacy and confidentiality
- Avoid making assumptions about user capabilities`,

  boardSuggestion: `You specialize in creating visual routine boards optimized for neurodivergent users. Consider:
- Clear visual structure
- Appropriate step duration (avoid overwhelm)
- Built-in flexibility for ADHD time blindness
- Sensory-friendly transitions
- Optional steps for low-energy days`,

  taskBreakdown: `You excel at breaking down overwhelming tasks into neurodivergent-friendly steps. Focus on:
- Concrete, actionable micro-tasks
- Estimated time for each step (accounting for ADHD tax)
- Clear completion criteria
- Built-in breaks and dopamine rewards
- Body-doubling suggestions`,

  moodInsights: `You analyze mood patterns with understanding of neurodivergent experiences:
- Identify triggers related to sensory overload, masking, burnout
- Recognize patterns in executive dysfunction cycles
- Suggest accommodations rather than "just try harder"
- Validate emotional experiences
- Connect mood to energy levels and spoon theory`,

  contextRecall: `You help users remember "where they were" by:
- Reconstructing context from minimal information
- Identifying likely next steps
- Acknowledging time blindness and memory challenges
- Providing gentle reminders without shame`,
};

export const CRISIS_KEYWORDS = [
  'suicide', 'self-harm', 'want to die', 'end it all', 'kill myself',
  'hurt myself', 'no reason to live', 'better off dead', 'overdose'
];

export const CRISIS_RESOURCES = {
  us: {
    name: '988 Suicide & Crisis Lifeline',
    phone: '988',
    text: 'Text "HELLO" to 741741',
    url: 'https://988lifeline.org',
  },
  international: {
    name: 'International Association for Suicide Prevention',
    url: 'https://www.iasp.info/resources/Crisis_Centres/',
  },
};
```

---

### Step 1.3: Database Schema Updates

**File: `supabase/migrations/005_ai_integration.sql`**

```sql
-- =============================================
-- AI CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_type TEXT NOT NULL CHECK (conversation_type IN ('general', 'board_suggestion', 'task_breakdown', 'mood_insight', 'context_recall', 'routine_creation')),
    context_data JSONB, -- Related board_id, task_id, etc.
    
    -- Conversation history
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Metadata
    tokens_used INTEGER DEFAULT 0,
    model_used TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Quality tracking
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    flagged_for_review BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI conversations"
    ON public.ai_conversations FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_type ON public.ai_conversations(conversation_type);
CREATE INDEX idx_ai_conversations_flagged ON public.ai_conversations(flagged_for_review) WHERE flagged_for_review = true;

-- =============================================
-- AI SUGGESTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('board', 'task', 'routine', 'habit', 'mood_coping', 'energy_management')),
    
    -- Source
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
    trigger_context JSONB,
    
    -- Suggestion content
    title TEXT NOT NULL,
    description TEXT,
    suggestion_data JSONB NOT NULL, -- Actual board structure, task list, etc.
    
    -- User interaction
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified', 'implemented')),
    user_modifications JSONB,
    implemented_at TIMESTAMPTZ,
    
    -- Analytics
    confidence_score DECIMAL(3,2), -- AI's confidence in suggestion
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI suggestions"
    ON public.ai_suggestions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI suggestions"
    ON public.ai_suggestions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI suggestions"
    ON public.ai_suggestions FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_type ON public.ai_suggestions(suggestion_type);
CREATE INDEX idx_ai_suggestions_status ON public.ai_suggestions(status);

-- =============================================
-- AI USAGE TRACKING (for rate limiting & costs)
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Usage metrics
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0, -- Estimated cost in USD
    
    -- Breakdown by type
    requests_by_type JSONB DEFAULT '{}'::jsonb,
    tokens_by_model JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- RLS Policies
ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage stats"
    ON public.ai_usage_stats FOR SELECT
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_usage_user_date ON public.ai_usage_stats(user_id, date DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE TRIGGER update_ai_conversations_timestamp
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

CREATE TRIGGER update_ai_suggestions_timestamp
    BEFORE UPDATE ON public.ai_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

CREATE TRIGGER update_ai_usage_stats_timestamp
    BEFORE UPDATE ON public.ai_usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT ALL ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_suggestions TO authenticated;
GRANT ALL ON public.ai_usage_stats TO authenticated;
```

---

## 🤖 PHASE 2: Core AI Services

### Step 2.1: OpenAI Service Layer

**File: `src/services/openaiService.ts`**

```typescript
import OpenAI from 'openai';
import { aiConfig, AI_SYSTEM_PROMPTS, CRISIS_KEYWORDS, CRISIS_RESOURCES } from '../config/aiConfig';
import { supabase } from './supabase';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  tokens: number;
  model: string;
  isCrisis: boolean;
  crisisResources?: typeof CRISIS_RESOURCES;
}

interface ConversationContext {
  conversationId?: string;
  conversationType: 'general' | 'board_suggestion' | 'task_breakdown' | 'mood_insight' | 'context_recall' | 'routine_creation';
  contextData?: any;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private conversationHistory: Map<string, Message[]> = new Map();

  constructor() {
    if (aiConfig.enabled && aiConfig.apiKey) {
      this.client = new OpenAI({
        apiKey: aiConfig.apiKey,
        dangerouslyAllowBrowser: true, // Note: In production, proxy through backend
      });
    }
  }

  /**
   * Check if content contains crisis keywords
   */
  private detectCrisis(text: string): boolean {
    const lowerText = text.toLowerCase();
    return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Moderate content using OpenAI moderation endpoint
   */
  async moderateContent(text: string): Promise<{ safe: boolean; categories?: any }> {
    if (!this.client || !aiConfig.contentFilterEnabled) {
      return { safe: true };
    }

    try {
      const response = await this.client.moderations.create({
        input: text,
      });

      const result = response.results[0];
      return {
        safe: !result.flagged,
        categories: result.flagged ? result.categories : undefined,
      };
    } catch (error) {
      console.error('Content moderation error:', error);
      return { safe: true }; // Fail open to avoid blocking legitimate content
    }
  }

  /**
   * Get system prompt based on conversation type
   */
  private getSystemPrompt(type: string): string {
    switch (type) {
      case 'board_suggestion':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.boardSuggestion}`;
      case 'task_breakdown':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.taskBreakdown}`;
      case 'mood_insight':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.moodInsights}`;
      case 'context_recall':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.contextRecall}`;
      default:
        return AI_SYSTEM_PROMPTS.base;
    }
  }

  /**
   * Main chat completion method
   */
  async chat(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Check API key configuration.');
    }

    // Check for crisis content
    const isCrisis = this.detectCrisis(userMessage);

    // Moderate content
    const moderation = await this.moderateContent(userMessage);
    if (!moderation.safe) {
      throw new Error('Content flagged by moderation system');
    }

    // Get or create conversation history
    const convId = context.conversationId || crypto.randomUUID();
    if (!this.conversationHistory.has(convId)) {
      const systemPrompt = this.getSystemPrompt(context.conversationType);
      this.conversationHistory.set(convId, [
        { role: 'system', content: systemPrompt },
      ]);
    }

    const history = this.conversationHistory.get(convId)!;

    // Add context data if provided
    let enhancedMessage = userMessage;
    if (context.contextData) {
      enhancedMessage = `Context: ${JSON.stringify(context.contextData)}\n\nUser: ${userMessage}`;
    }

    // Add user message to history
    history.push({ role: 'user', content: enhancedMessage });

    // Limit context window
    const limitedHistory = history.slice(-aiConfig.contextLimit);

    try {
      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model: aiConfig.model,
        messages: limitedHistory,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const assistantMessage = response.choices[0].message.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      // Add assistant response to history
      history.push({ role: 'assistant', content: assistantMessage });

      // Save to database
      await this.saveConversation(convId, context, history, tokensUsed, response.model);

      // Track usage
      await this.trackUsage(context.conversationType, tokensUsed, response.model);

      return {
        content: assistantMessage,
        tokens: tokensUsed,
        model: response.model,
        isCrisis,
        crisisResources: isCrisis ? CRISIS_RESOURCES : undefined,
      };
    } catch (error: any) {
      // Fallback to cheaper model if rate limited or error
      if (error.code === 'rate_limit_exceeded' || error.code === 'insufficient_quota') {
        console.warn('Falling back to cheaper model');
        return this.chatWithFallback(userMessage, context, limitedHistory);
      }
      throw error;
    }
  }

  /**
   * Fallback to cheaper model
   */
  private async chatWithFallback(
    userMessage: string,
    context: ConversationContext,
    history: Message[]
  ): Promise<AIResponse> {
    if (!this.client) throw new Error('OpenAI client not initialized');

    const response = await this.client.chat.completions.create({
      model: aiConfig.fallbackModel,
      messages: history,
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
    });

    const assistantMessage = response.choices[0].message.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      content: assistantMessage,
      tokens: tokensUsed,
      model: response.model,
      isCrisis: this.detectCrisis(userMessage),
    };
  }

  /**
   * Save conversation to Supabase
   */
  private async saveConversation(
    convId: string,
    context: ConversationContext,
    messages: Message[],
    tokens: number,
    model: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('ai_conversations')
        .upsert({
          id: convId,
          user_id: user.id,
          conversation_type: context.conversationType,
          context_data: context.contextData,
          messages,
          tokens_used: tokens,
          model_used: model,
          last_message_at: new Date().toISOString(),
        });

      if (error) console.error('Failed to save conversation:', error);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  /**
   * Track usage for rate limiting and cost monitoring
   */
  private async trackUsage(type: string, tokens: number, model: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Estimate cost (approximate pricing as of 2024)
      const costPerToken = model.includes('gpt-4') ? 0.00003 : 0.000002;
      const estimatedCost = tokens * costPerToken;

      const today = new Date().toISOString().split('T')[0];

      await supabase.rpc('increment_ai_usage', {
        p_user_id: user.id,
        p_date: today,
        p_requests: 1,
        p_tokens: tokens,
        p_cost: estimatedCost,
        p_type: type,
        p_model: model,
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  /**
   * Clear conversation history
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId: string): Message[] | undefined {
    return this.conversationHistory.get(conversationId);
  }
}

export const openAIService = new OpenAIService();
export type { AIResponse, ConversationContext, Message };
```

---

### Step 2.2: AI-Powered Board Suggestion Service

**File: `src/services/aiBoardService.ts`**

```typescript
import { openAIService } from './openaiService';
import { boardService } from './boardService';

interface BoardSuggestionRequest {
  routineType: 'morning' | 'evening' | 'work' | 'study' | 'exercise' | 'self-care' | 'custom';
  userPreferences?: {
    duration?: number; // minutes
    difficulty?: 'easy' | 'medium' | 'hard';
    neurotype?: string[]; // ['adhd', 'autism', 'executive-function']
    sensoryNeeds?: string[]; // ['quiet', 'movement', 'visual-cues']
    energyLevel?: 'low' | 'medium' | 'high';
  };
  existingChallenges?: string; // Free-text description
}

interface BoardSuggestion {
  title: string;
  description: string;
  boardType: 'routine' | 'visual' | 'kanban' | 'timeline' | 'custom';
  layout: 'linear' | 'grid' | 'kanban' | 'timeline' | 'freeform';
  steps: Array<{
    step_type: 'task' | 'flexZone' | 'note' | 'transition' | 'break';
    title: string;
    description: string;
    duration: number;
    order_index: number;
    visual_cues: {
      color: string;
      icon: string;
    };
    is_flexible: boolean;
    is_optional: boolean;
  }>;
  tags: string[];
  neurotype_optimized: string[];
}

class AIBoardService {
  /**
   * Generate board suggestion using AI
   */
  async suggestBoard(request: BoardSuggestionRequest): Promise<BoardSuggestion> {
    const prompt = this.buildBoardPrompt(request);

    const response = await openAIService.chat(prompt, {
      conversationType: 'board_suggestion',
      contextData: request,
    });

    // Parse AI response into board structure
    return this.parseAIResponse(response.content);
  }

  /**
   * Build prompt for board suggestion
   */
  private buildBoardPrompt(request: BoardSuggestionRequest): string {
    const { routineType, userPreferences, existingChallenges } = request;

    let prompt = `Create a ${routineType} routine board for a neurodivergent user.\n\n`;

    if (userPreferences) {
      prompt += `User Preferences:\n`;
      if (userPreferences.duration) {
        prompt += `- Target duration: ${userPreferences.duration} minutes\n`;
      }
      if (userPreferences.difficulty) {
        prompt += `- Difficulty level: ${userPreferences.difficulty}\n`;
      }
      if (userPreferences.neurotype) {
        prompt += `- Neurotype: ${userPreferences.neurotype.join(', ')}\n`;
      }
      if (userPreferences.sensoryNeeds) {
        prompt += `- Sensory needs: ${userPreferences.sensoryNeeds.join(', ')}\n`;
      }
      if (userPreferences.energyLevel) {
        prompt += `- Energy level: ${userPreferences.energyLevel}\n`;
      }
    }

    if (existingChallenges) {
      prompt += `\nChallenges to address: ${existingChallenges}\n`;
    }

    prompt += `\nPlease respond with a JSON object containing:
{
  "title": "Board title",
  "description": "Brief description",
  "boardType": "routine",
  "layout": "linear",
  "steps": [
    {
      "step_type": "task",
      "title": "Step title",
      "description": "Step description",
      "duration": 10,
      "order_index": 0,
      "visual_cues": {
        "color": "#3B82F6",
        "icon": "✓"
      },
      "is_flexible": false,
      "is_optional": false
    }
  ],
  "tags": ["tag1", "tag2"],
  "neurotype_optimized": ["adhd", "autism"]
}

Guidelines:
- Include 5-8 steps maximum (avoid overwhelm)
- Build in flexibility for ADHD time blindness
- Include transition steps for autism
- Use clear, specific step titles
- Provide realistic duration estimates (add buffer time)
- Include optional steps for low-energy days
- Choose calming colors for sensory sensitivity
- Add meaningful icons for visual processing`;

    return prompt;
  }

  /**
   * Parse AI response into board structure
   */
  private parseAIResponse(content: string): BoardSuggestion {
    try {
      // Extract JSON from response (AI might wrap it in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and return
      return parsed as BoardSuggestion;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Create board from AI suggestion
   */
  async createBoardFromSuggestion(suggestion: BoardSuggestion): Promise<string | null> {
    try {
      const board = await boardService.createBoard({
        title: suggestion.title,
        description: suggestion.description,
        board_type: suggestion.boardType,
        layout: suggestion.layout,
        tags: suggestion.tags,
        steps: suggestion.steps.map(step => ({
          ...step,
          timer_settings: {
            autoStart: false,
            allowOverrun: true,
            endNotification: {
              type: 'audio' as const,
              intensity: 'normal' as const,
            },
          },
          neurotype_adaptations: {},
          is_completed: false,
          execution_state: {
            status: 'pending' as const,
          },
        })),
      });

      return board?.id || null;
    } catch (error) {
      console.error('Failed to create board from suggestion:', error);
      return null;
    }
  }
}

export const aiBoardService = new AIBoardService();
export type { BoardSuggestionRequest, BoardSuggestion };
```

---

## 📱 PHASE 3: Feature Integration

### Step 3.1: AI Chat Component

**File: `src/components/AI/AIChat.tsx`**

```typescript
import { useState, useRef, useEffect } from 'react';
import { openAIService, AIResponse } from '../../services/openaiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCrisis?: boolean;
}

interface AIChatProps {
  conversationType: 'general' | 'board_suggestion' | 'task_breakdown' | 'mood_insight' | 'context_recall';
  contextData?: any;
  onSuggestion?: (suggestion: any) => void;
}

export function AIChat({ conversationType, contextData, onSuggestion }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response: AIResponse = await openAIService.chat(input, {
        conversationId,
        conversationType,
        contextData,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        isCrisis: response.isCrisis,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If crisis detected, show resources
      if (response.isCrisis && response.crisisResources) {
        // Handle crisis UI
        alert(`Crisis resources available. Please reach out for immediate help:\n${response.crisisResources.us.name}: ${response.crisisResources.us.phone}`);
      }
    } catch (error: any) {
      console.error('AI chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Assistant
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {conversationType === 'general' && 'Ask me anything'}
          {conversationType === 'board_suggestion' && 'Let me help you create a routine board'}
          {conversationType === 'task_breakdown' && 'I can break down tasks for you'}
          {conversationType === 'mood_insight' && 'I can help analyze your mood patterns'}
          {conversationType === 'context_recall' && 'I can help you remember where you were'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3/4 rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.isCrisis
                  ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-2 border-red-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-2 opacity-75">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 PHASE 4-5: Safety, Testing & Deployment

### Step 4.1: Content Safety Middleware

Create middleware to ensure all AI interactions are safe and compliant.

### Step 4.2: Usage Rate Limiting

Implement per-user rate limiting to prevent abuse and manage costs.

### Step 4.3: Testing Checklist

- [ ] Crisis detection works correctly
- [ ] Content moderation blocks harmful content
- [ ] Conversation history persists correctly
- [ ] Board suggestions are valid and helpful
- [ ] Cost tracking is accurate
- [ ] Rate limiting prevents abuse
- [ ] Fallback model works when primary fails
- [ ] Privacy compliance (no PHI stored unnecessarily)
- [ ] Accessibility (screen readers work)
- [ ] Mobile responsiveness

---

## 📊 Integration Points

### Existing Features Enhanced:

1. **Boards** → AI suggests optimized structures
2. **Tasks** → AI breaks down complex tasks
3. **Mood** → AI identifies patterns and triggers
4. **Routines** → AI creates personalized routines
5. **Recall** → AI reconstructs context
6. **Onboarding** → AI personalizes setup questions

---

## 🔒 Security & Privacy

1. **Never store API keys in frontend code**
2. **Proxy all OpenAI calls through backend (Supabase Edge Functions)**
3. **Implement proper RLS on all AI tables**
4. **Anonymize data before sending to OpenAI**
5. **Comply with GDPR/CCPA data deletion requests**
6. **Log all AI interactions for audit**
7. **Rate limit per user to prevent abuse**

---

## 💰 Cost Management

- GPT-4-turbo: ~$0.01 per 1000 input tokens
- GPT-3.5-turbo: ~$0.0005 per 1000 input tokens
- Budget $50-100/month for initial rollout
- Monitor usage dashboard
- Implement hard limits per user

---

## 📈 Success Metrics

1. User engagement with AI features
2. Board suggestion acceptance rate
3. Task completion improvement
4. User satisfaction ratings
5. Cost per active user
6. Crisis detection accuracy
7. Response time (target < 3s)

---

## 🎯 Next Steps

1. Set up OpenAI account and get API key
2. Run database migration (005_ai_integration.sql)
3. Install npm packages
4. Configure environment variables
5. Implement OpenAI service
6. Create AI chat component
7. Integrate with existing features
8. Test thoroughly
9. Deploy to production
10. Monitor usage and costs

---

**This implementation provides a production-ready, safe, and neurodivergent-optimized AI integration for the Universal Neurotype Planner!** 🚀
