/**
 * OpenAI Service Layer
 * Handles all AI interactions with safety, moderation, and conversation management
 */

// OpenAI calls are proxied server-side via Supabase Edge Function `ai_proxy`
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { supabaseService } from './supabase';
import {
  aiConfig,
  AI_SYSTEM_PROMPTS,
  CRISIS_KEYWORDS,
  CRISIS_RESOURCES,
  RATE_LIMITS,
  TOKEN_COSTS,
  type ConversationType,
} from '../config/aiConfig';
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
  conversationId: string;
}

interface ConversationContext {
  conversationId?: string;
  conversationType: ConversationType;
  contextData?: Record<string, any>;
}

interface ModerationResult {
  safe: boolean;
  categories?: Record<string, boolean>;
  flagged: boolean;
}

interface RateLimitCheck {
  allowed: boolean;
  hourlyCount: number;
  dailyCount: number;
  hourlyLimit: number;
  dailyLimit: number;
}

class OpenAIService {
  private conversationHistory: Map<string, Message[]> = new Map();

  constructor() {
    // Prefer server-side proxy for OpenAI usage. The proxy function `ai_proxy`
    // should be deployed to Supabase Edge Functions and have access to the
    // OpenAI API key. This client will call that function via
    // `supabaseService.invokeFunction('ai_proxy', payload)`.
    if (!aiConfig.enabled) {
      console.warn('AI features are disabled via configuration');
    }
  }

  /**
   * Check if OpenAI is enabled and configured
   */
  isEnabled(): boolean {
    return aiConfig.enabled;
  }

  /**
   * Detect crisis keywords in user message
   */
  private detectCrisis(text: string): boolean {
    const lowerText = text.toLowerCase();
    return CRISIS_KEYWORDS.some((keyword) => lowerText.includes(keyword));
  }

  /**
   * Moderate content using OpenAI moderation endpoint
   */
  async moderateContent(text: string): Promise<ModerationResult> {
    if (!aiConfig.contentFilterEnabled) return { safe: true, flagged: false };

    try {
      const result = await supabaseService.invokeFunction<any>('ai_proxy', { action: 'moderation', userMessage: text });
      if (!result) return { safe: true, flagged: false };
      if (result.error) return { safe: false, flagged: true };
      const flagged = Boolean(result.flagged);
      return { safe: !flagged, flagged };
    } catch (error) {
      console.error('Moderation proxy error:', error);
      return { safe: true, flagged: false };
    }
  }

  /**
   * Check rate limits for user
   */
  async checkRateLimit(): Promise<RateLimitCheck> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          allowed: false,
          hourlyCount: 0,
          dailyCount: 0,
          hourlyLimit: RATE_LIMITS.requestsPerHour,
          dailyLimit: RATE_LIMITS.requestsPerDay,
        };
      }

      const { data, error } = await supabase.rpc('check_ai_rate_limit', {
        p_user_id: user.id,
        p_hourly_limit: RATE_LIMITS.requestsPerHour,
        p_daily_limit: RATE_LIMITS.requestsPerDay,
      });

      if (error) {
        console.error('Rate limit check error:', error);
        return {
          allowed: true, // Fail open
          hourlyCount: 0,
          dailyCount: 0,
          hourlyLimit: RATE_LIMITS.requestsPerHour,
          dailyLimit: RATE_LIMITS.requestsPerDay,
        };
      }

      const result = data[0];
      return {
        allowed: result.within_limits,
        hourlyCount: result.hourly_count,
        dailyCount: result.daily_count,
        hourlyLimit: RATE_LIMITS.requestsPerHour,
        dailyLimit: RATE_LIMITS.requestsPerDay,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return {
        allowed: true, // Fail open
        hourlyCount: 0,
        dailyCount: 0,
        hourlyLimit: RATE_LIMITS.requestsPerHour,
        dailyLimit: RATE_LIMITS.requestsPerDay,
      };
    }
  }

  /**
   * Get system prompt based on conversation type
   */
  private getSystemPrompt(type: ConversationType): string {
    switch (type) {
      case 'board_suggestion':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.boardSuggestion}`;
      case 'task_breakdown':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.taskBreakdown}`;
      case 'mood_insight':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.moodInsights}`;
      case 'context_recall':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.contextRecall}`;
      case 'routine_creation':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.routineCreation}`;
      case 'health_support':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.healthCoach}`;
      case 'nutrition_support':
        return `${AI_SYSTEM_PROMPTS.base}\n\n${AI_SYSTEM_PROMPTS.nutritionGuide}`;
      default:
        return AI_SYSTEM_PROMPTS.base;
    }
  }

  /**
   * Main chat completion method
   */
  async chat(userMessage: string, context: ConversationContext): Promise<AIResponse> {
    // Check rate limits
    const rateLimit = await this.checkRateLimit();
    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Hourly: ${rateLimit.hourlyCount}/${rateLimit.hourlyLimit}, Daily: ${rateLimit.dailyCount}/${rateLimit.dailyLimit}`
      );
    }

    // Check for crisis content
    const isCrisis = this.detectCrisis(userMessage);

    // Get or create conversation history
    const convId = context.conversationId || crypto.randomUUID();
    if (!this.conversationHistory.has(convId)) {
      const systemPrompt = this.getSystemPrompt(context.conversationType);
      this.conversationHistory.set(convId, [{ role: 'system', content: systemPrompt }]);
    }

    const history = this.conversationHistory.get(convId)!;

    // Add context data if provided
    let enhancedMessage = userMessage;
    if (context.contextData) {
      enhancedMessage = `Context: ${JSON.stringify(context.contextData, null, 2)}\n\nUser: ${userMessage}`;
    }

    // Add user message to history
    history.push({ role: 'user', content: enhancedMessage });

    // Limit context window
    const limitedHistory = history.slice(-aiConfig.contextLimit);

    try {
      // Invoke the Supabase Edge Function `ai_proxy` which performs the OpenAI call server-side
      const payload = {
        messages: limitedHistory,
        systemPrompt: this.getSystemPrompt(context.conversationType),
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        conversationId: convId,
      } as Record<string, unknown>;

      const result = await supabaseService.invokeFunction<any>('ai_proxy', payload);
      if (!result) throw new Error('AI proxy returned no result');

      if ((result as any).error === 'content_flagged') {
        throw new Error('Content flagged by moderation system');
      }

      const assistantMessage = result.content || '';
      const tokensUsed = result.tokens || 0;
      const modelUsed = result.model || aiConfig.model;

      // Add assistant response to history
      history.push({ role: 'assistant', content: assistantMessage });

      // Save to database
      await this.saveConversation(convId, context, history, tokensUsed, modelUsed);

      // Track usage
      await this.trackUsage(context.conversationType, tokensUsed, modelUsed);

      return {
        content: assistantMessage,
        tokens: tokensUsed,
        model: modelUsed,
        isCrisis,
        crisisResources: isCrisis ? CRISIS_RESOURCES : undefined,
        conversationId: convId,
      };
    } catch (error: any) {
      console.error('AI proxy/chat error', error);
      const errorMessage = error?.message ?? 'Unknown AI error';
      if (errorMessage.includes('quota') || errorMessage.includes('insufficient')) {
        throw new Error('OpenAI quota exceeded. Please update your billing plan or provide a different API key.');
      }
      // For rate limits / server errors, propagate error up
      throw error;
    }
  }

  /**
   * Fallback to cheaper model
   */
  private async chatWithFallback(
    userMessage: string,
    context: ConversationContext,
    history: Message[],
    convId: string
  ): Promise<AIResponse> {
    // Use proxy with fallback model
    const payload = {
      messages: history,
      model: aiConfig.fallbackModel,
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
      conversationId: convId,
    } as Record<string, unknown>;

    const result = await supabaseService.invokeFunction<any>('ai_proxy', payload);
    if (!result) throw new Error('AI proxy fallback failed');

    const assistantMessage = result.content || '';
    const tokensUsed = result.tokens || 0;
    const modelUsed = result.model || aiConfig.fallbackModel;

    const fullHistory = this.conversationHistory.get(convId) || [];
    fullHistory.push({ role: 'assistant', content: assistantMessage });

    await this.saveConversation(convId, context, fullHistory, tokensUsed, modelUsed);
    await this.trackUsage(context.conversationType, tokensUsed, modelUsed);

    return {
      content: assistantMessage,
      tokens: tokensUsed,
      model: modelUsed,
      isCrisis: this.detectCrisis(userMessage),
      conversationId: convId,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('ai_conversations').upsert({
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
  private async trackUsage(type: ConversationType, tokens: number, model: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Estimate cost
      const modelKey = model as keyof typeof TOKEN_COSTS;
      const costData = TOKEN_COSTS[modelKey] || TOKEN_COSTS['gpt-3.5-turbo'];
      const estimatedCost = (tokens / 2) * costData.input + (tokens / 2) * costData.output;

      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase.rpc('increment_ai_usage', {
        p_user_id: user.id,
        p_date: today,
        p_requests: 1,
        p_tokens: tokens,
        p_cost: estimatedCost,
        p_type: type,
        p_model: model,
      });

      if (error) console.error('Failed to track usage:', error);
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

  /**
   * Load conversation from database
   */
  async loadConversation(conversationId: string): Promise<Message[] | null> {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      if (error || !data) return null;

      const messages = data.messages as Message[];
      this.conversationHistory.set(conversationId, messages);
      return messages;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }

  /**
   * Get user's recent conversations
   */
  async getRecentConversations(limit: number = 10): Promise<any[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Rate conversation
   */
  async rateConversation(conversationId: string, rating: number, feedback?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({
          user_rating: rating,
          user_feedback: feedback,
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error rating conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error rating conversation:', error);
      return false;
    }
  }

  /**
   * Flag conversation for review
   */
  async flagConversation(conversationId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({
          flagged_for_review: true,
          flag_reason: reason,
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error flagging conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error flagging conversation:', error);
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
export type { AIResponse, ConversationContext, Message, ModerationResult, RateLimitCheck };
