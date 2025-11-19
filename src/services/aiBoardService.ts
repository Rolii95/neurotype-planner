/**
 * AI Board Service
 * AI-powered board suggestion and creation
 */

import { openAIService } from './openaiService';
import { boardService, type Board, type BoardStep } from './boardService';
import { supabase } from './supabase';

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
  conversationId?: string;
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
  rationale?: string; // AI explanation of choices
}

class AIBoardService {
  /**
   * Generate board suggestion using AI
   */
  async suggestBoard(request: BoardSuggestionRequest): Promise<{
    suggestion: BoardSuggestion;
    conversationId: string;
    suggestionId: string;
  }> {
    const prompt = this.buildBoardPrompt(request);

    const response = await openAIService.chat(prompt, {
      conversationId: request.conversationId,
      conversationType: 'board_suggestion',
      contextData: request,
    });

    // Parse AI response into board structure
    const suggestion = this.parseAIResponse(response.content);

    // Save suggestion to database
    const suggestionId = await this.saveSuggestion(
      suggestion,
      response.conversationId,
      request
    );

    return {
      suggestion,
      conversationId: response.conversationId,
      suggestionId,
    };
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
      if (userPreferences.neurotype && userPreferences.neurotype.length > 0) {
        prompt += `- Neurotype: ${userPreferences.neurotype.join(', ')}\n`;
      }
      if (userPreferences.sensoryNeeds && userPreferences.sensoryNeeds.length > 0) {
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
  "description": "Brief description explaining the board's purpose",
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
  "neurotype_optimized": ["adhd", "autism"],
  "rationale": "Brief explanation of why these steps were chosen"
}

IMPORTANT GUIDELINES:
- Include 5-8 steps maximum (avoid overwhelm)
- Build in flexibility for ADHD time blindness
- Include transition steps for autism
- Use clear, specific step titles (no vague language)
- Provide realistic duration estimates with buffer time
- Include optional steps for low-energy days
- Choose calming colors for sensory sensitivity
- Add meaningful icons/emojis for visual processing
- Consider spoon theory and energy management
- Include breaks and regulation opportunities
- Make it achievable, not aspirational`;

    return prompt;
  }

  /**
   * Parse AI response into board structure
   */
  private parseAIResponse(content: string): BoardSuggestion {
    try {
      // Extract JSON from response (AI might wrap it in markdown code blocks)
      let jsonStr = content;
      
      // Try to find JSON wrapped in code blocks
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      } else {
        // Try to find raw JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.title || !parsed.steps || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid board structure: missing required fields');
      }

      return parsed as BoardSuggestion;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Response content:', content);
      throw new Error('Invalid AI response format. Please try again.');
    }
  }

  /**
   * Save suggestion to database
   */
  private async saveSuggestion(
    suggestion: BoardSuggestion,
    conversationId: string,
    request: BoardSuggestionRequest
  ): Promise<string> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ai_suggestions')
        .insert({
          user_id: user.id,
          suggestion_type: 'board',
          conversation_id: conversationId,
          trigger_context: request,
          title: suggestion.title,
          description: suggestion.description,
          suggestion_data: suggestion,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Failed to save suggestion:', error);
      throw error;
    }
  }

  /**
   * Create board from AI suggestion
   */
  async createBoardFromSuggestion(
    suggestionId: string,
    modifications?: Partial<BoardSuggestion>
  ): Promise<Board | null> {
    try {
      // Get suggestion from database
      const { data: suggestionData, error: fetchError } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (fetchError || !suggestionData) {
        console.error('Failed to fetch suggestion:', fetchError);
        return null;
      }

      const suggestion = suggestionData.suggestion_data as BoardSuggestion;

      // Apply modifications if provided
      const finalSuggestion = modifications
        ? { ...suggestion, ...modifications }
        : suggestion;

      // Create board via boardService
      const board = await boardService.createBoard({
        title: finalSuggestion.title,
        description: finalSuggestion.description,
        board_type: finalSuggestion.boardType,
        layout: finalSuggestion.layout,
        tags: finalSuggestion.tags,
        steps: finalSuggestion.steps.map((step) => ({
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

      if (board) {
        // Update suggestion status
        await supabase
          .from('ai_suggestions')
          .update({
            status: modifications ? 'modified' : 'implemented',
            user_modifications: modifications,
            implemented_at: new Date().toISOString(),
            implemented_id: board.id,
          })
          .eq('id', suggestionId);
      }

      return board;
    } catch (error) {
      console.error('Failed to create board from suggestion:', error);
      return null;
    }
  }

  /**
   * Get user's board suggestions
   */
  async getUserSuggestions(status?: string): Promise<any[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('suggestion_type', 'board')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }

  /**
   * Accept suggestion
   */
  async acceptSuggestion(suggestionId: string): Promise<Board | null> {
    return this.createBoardFromSuggestion(suggestionId);
  }

  /**
   * Reject suggestion
   */
  async rejectSuggestion(suggestionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error rejecting suggestion:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      return false;
    }
  }

  /**
   * Optimize existing board with AI suggestions
   */
  async optimizeBoard(boardId: string, feedback: string): Promise<BoardSuggestion | null> {
    try {
      // Get current board
      const boardData = await boardService.getBoard(boardId);
      if (!boardData) return null;

      const prompt = `Analyze and optimize this existing routine board based on user feedback.

Current Board:
${JSON.stringify(
  {
    title: boardData.board.title,
    description: boardData.board.description,
    steps: boardData.steps,
  },
  null,
  2
)}

User Feedback: ${feedback}

Please suggest improvements while maintaining the core structure. Focus on:
- Better time estimates
- Improved step order
- Additional optional steps
- Better sensory accommodations
- Energy management optimizations

Respond with the same JSON format as before, including a "rationale" field explaining your changes.`;

      const response = await openAIService.chat(prompt, {
        conversationType: 'board_suggestion',
        contextData: { boardId, feedback },
      });

      return this.parseAIResponse(response.content);
    } catch (error) {
      console.error('Failed to optimize board:', error);
      return null;
    }
  }
}

export const aiBoardService = new AIBoardService();
export type { BoardSuggestionRequest, BoardSuggestion };
