/**
 * AI Task Service
 * 
 * Handles AI-powered task breakdown with neurodivergent-optimized micro-steps.
 * Features:
 * - Breaks complex tasks into 5-15 minute micro-tasks
 * - Adds buffer time for ADHD tax
 * - Includes sensory considerations
 * - Provides energy-appropriate steps
 * - Adds dopamine rewards
 */

import { openAIService } from './openaiService';
import { supabase } from './supabase';

interface ConversationContext {
  conversationId?: string;
  conversationType: 'general' | 'board_suggestion' | 'task_breakdown' | 'mood_insight' | 'context_recall' | 'routine_creation';
  contextData?: Record<string, any>;
}

export interface TaskBreakdownRequest {
  taskTitle: string;
  taskDescription?: string;
  estimatedDuration?: number; // in minutes
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  energyLevel?: 'very-low' | 'low' | 'medium' | 'high';
  neurotype?: ('adhd' | 'autism' | 'executive-dysfunction')[];
  sensoryNeeds?: string[];
  availableTime?: number; // in minutes
  currentContext?: string; // What are they doing right now?
  barriers?: string[]; // Known obstacles
}

export interface TaskStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: number; // in minutes
  energyRequired: 'low' | 'medium' | 'high';
  dificulty: 'easy' | 'moderate' | 'challenging';
  completionCriteria: string;
  sensoryConsiderations?: string[];
  tips?: string[];
  dopamineReward?: string;
  isOptional?: boolean;
  prerequisiteSteps?: number[]; // Step numbers that must be done first
}

export interface TaskBreakdown {
  id?: string;
  taskTitle: string;
  taskDescription: string;
  totalEstimatedDuration: number; // in minutes
  steps: TaskStep[];
  neurotypeTips: string[];
  potentialBarriers: string[];
  successStrategies: string[];
  alternativeApproaches?: string[];
  breakSuggestions?: string[];
  motivationBoosts?: string[];
  createdAt?: Date;
}

export interface TaskSuggestion {
  id: string;
  userId: string;
  taskBreakdown: TaskBreakdown;
  status: 'pending' | 'accepted' | 'modified' | 'implemented';
  implementedTaskId?: string;
  createdAt: Date;
}

interface AiSuggestionRow {
  id: string;
  user_id: string;
  suggestion_data: TaskBreakdown | null;
  status: TaskSuggestion['status'];
  implemented_id?: string | null;
  created_at: string;
}

class AITaskService {
  /**
   * Break down a complex task into neurodivergent-friendly micro-steps
   */
  async breakdownTask(request: TaskBreakdownRequest): Promise<TaskBreakdown> {
    try {
      const prompt = this.buildTaskPrompt(request);
      
      const context: ConversationContext = {
        conversationType: 'task_breakdown',
        contextData: {
          taskTitle: request.taskTitle,
          estimatedDuration: request.estimatedDuration,
          urgency: request.urgency,
          energyLevel: request.energyLevel,
          neurotype: request.neurotype,
          sensoryNeeds: request.sensoryNeeds,
        }
      };

      const response = await openAIService.chat(prompt, context);

      if (response.isCrisis) {
        throw new Error('Task breakdown triggered crisis detection. Please seek support.');
      }

      const breakdown = this.parseTaskResponse(response.content, request);

      // Save to database
      if (response.conversationId) {
        await this.saveTaskBreakdown(response.conversationId, breakdown);
      }

      return breakdown;
    } catch (error) {
      console.error('Task breakdown error:', error);
      throw error;
    }
  }

  /**
   * Build a detailed prompt for task breakdown
   */
  private buildTaskPrompt(request: TaskBreakdownRequest): string {
    const {
      taskTitle,
      taskDescription,
      estimatedDuration,
      urgency,
      energyLevel,
      neurotype,
      sensoryNeeds,
      availableTime,
      currentContext,
      barriers
    } = request;

    let prompt = `I need help breaking down this task into micro-steps:\n\n`;
    prompt += `**Task**: ${taskTitle}\n`;
    
    if (taskDescription) {
      prompt += `**Description**: ${taskDescription}\n`;
    }

    if (estimatedDuration) {
      prompt += `**Estimated Duration**: ${estimatedDuration} minutes\n`;
    }

    if (availableTime) {
      prompt += `**Available Time**: ${availableTime} minutes\n`;
    }

    if (urgency) {
      prompt += `**Urgency**: ${urgency}\n`;
    }

    if (energyLevel) {
      prompt += `**Current Energy Level**: ${energyLevel}\n`;
    }

    if (neurotype && neurotype.length > 0) {
      prompt += `**Neurotype Considerations**: ${neurotype.join(', ')}\n`;
    }

    if (sensoryNeeds && sensoryNeeds.length > 0) {
      prompt += `**Sensory Needs**: ${sensoryNeeds.join(', ')}\n`;
    }

    if (currentContext) {
      prompt += `**Current Context**: ${currentContext}\n`;
    }

    if (barriers && barriers.length > 0) {
      prompt += `**Known Barriers**: ${barriers.join(', ')}\n`;
    }

    prompt += `\n**Please provide**:\n`;
    prompt += `1. Broken down into 5-15 minute micro-tasks\n`;
    prompt += `2. Clear completion criteria for each step\n`;
    prompt += `3. Energy requirements (low/medium/high) for each step\n`;
    prompt += `4. Difficulty level (easy/moderate/challenging)\n`;
    prompt += `5. Dopamine rewards for completing steps\n`;
    prompt += `6. Sensory considerations when relevant\n`;
    prompt += `7. Tips for overcoming common obstacles\n`;
    prompt += `8. Alternative approaches if the main path doesn't work\n`;
    prompt += `9. Suggestions for breaks/transitions\n`;
    prompt += `10. Motivation boosters for maintaining momentum\n\n`;

    prompt += `Format as a structured breakdown with clear, actionable steps.`;

    return prompt;
  }

  /**
   * Parse AI response into TaskBreakdown structure
   */
  private parseTaskResponse(content: string, request: TaskBreakdownRequest): TaskBreakdown {
    // Try to extract JSON if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        // Fall through to text parsing
      }
    }

    // Text-based parsing (fallback)
    const steps: TaskStep[] = [];
    const lines = content.split('\n');
    
    let currentStep: Partial<TaskStep> | null = null;
    let stepNumber = 1;
    let neurotypeTips: string[] = [];
    let potentialBarriers: string[] = [];
    let successStrategies: string[] = [];
    let alternativeApproaches: string[] = [];
    let breakSuggestions: string[] = [];
    let motivationBoosts: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect step headers
      if (trimmed.match(/^(?:Step|Task|\d+\.)\s+/i)) {
        if (currentStep && currentStep.title) {
          steps.push(this.completeStep(currentStep, stepNumber - 1));
        }
        currentStep = {
          stepNumber: stepNumber++,
          title: trimmed.replace(/^(?:Step|Task|\d+\.)\s+/i, ''),
          description: '',
          estimatedDuration: 10,
          energyRequired: 'medium',
          dificulty: 'moderate',
          completionCriteria: '',
        };
      }
      // Detect metadata
      else if (trimmed.match(/duration:?\s*(\d+)/i)) {
        if (currentStep) {
          currentStep.estimatedDuration = parseInt(trimmed.match(/(\d+)/)![1]);
        }
      }
      else if (trimmed.match(/energy:?\s*(low|medium|high)/i)) {
        if (currentStep) {
          currentStep.energyRequired = trimmed.match(/(low|medium|high)/i)![1].toLowerCase() as 'low' | 'medium' | 'high';
        }
      }
      else if (trimmed.match(/difficulty:?\s*(easy|moderate|challenging)/i)) {
        if (currentStep) {
          currentStep.dificulty = trimmed.match(/(easy|moderate|challenging)/i)![1].toLowerCase() as 'easy' | 'moderate' | 'challenging';
        }
      }
      else if (trimmed.match(/reward:?\s*(.+)/i)) {
        if (currentStep) {
          currentStep.dopamineReward = trimmed.match(/reward:?\s*(.+)/i)![1];
        }
      }
      else if (trimmed.match(/completion:?\s*(.+)/i)) {
        if (currentStep) {
          currentStep.completionCriteria = trimmed.match(/completion:?\s*(.+)/i)![1];
        }
      }
      // Collect tips and strategies
      else if (trimmed.match(/tip:?\s*(.+)/i)) {
        neurotypeTips.push(trimmed.match(/tip:?\s*(.+)/i)![1]);
      }
      else if (trimmed.match(/barrier:?\s*(.+)/i)) {
        potentialBarriers.push(trimmed.match(/barrier:?\s*(.+)/i)![1]);
      }
      else if (trimmed.match(/strategy:?\s*(.+)/i)) {
        successStrategies.push(trimmed.match(/strategy:?\s*(.+)/i)![1]);
      }
      else if (trimmed.match(/alternative:?\s*(.+)/i)) {
        alternativeApproaches.push(trimmed.match(/alternative:?\s*(.+)/i)![1]);
      }
      else if (trimmed.match(/break:?\s*(.+)/i)) {
        breakSuggestions.push(trimmed.match(/break:?\s*(.+)/i)![1]);
      }
      else if (trimmed.match(/motivation:?\s*(.+)/i)) {
        motivationBoosts.push(trimmed.match(/motivation:?\s*(.+)/i)![1]);
      }
      // Add to description
      else if (currentStep && trimmed && !trimmed.match(/^[#*-]/)) {
        currentStep.description += (currentStep.description ? ' ' : '') + trimmed;
      }
    }

    // Add last step
    if (currentStep && currentStep.title) {
      steps.push(this.completeStep(currentStep, stepNumber - 1));
    }

    // Calculate total duration
    const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

    return {
      taskTitle: request.taskTitle,
      taskDescription: request.taskDescription || '',
      totalEstimatedDuration: totalDuration,
      steps,
      neurotypeTips: neurotypeTips.length > 0 ? neurotypeTips : [
        'Take breaks between steps',
        'Use timers to maintain focus',
        'Celebrate small wins'
      ],
      potentialBarriers: potentialBarriers.length > 0 ? potentialBarriers : [
        'Difficulty starting',
        'Losing momentum mid-task',
        'Perfectionism causing delays'
      ],
      successStrategies: successStrategies.length > 0 ? successStrategies : [
        'Start with the easiest step',
        'Use body doubling or accountability',
        'Set a timer for focused work'
      ],
      alternativeApproaches,
      breakSuggestions: breakSuggestions.length > 0 ? breakSuggestions : [
        'Take a 5-minute movement break between steps',
        'Step outside for fresh air after completing half',
        'Switch to a different task if feeling stuck'
      ],
      motivationBoosts: motivationBoosts.length > 0 ? motivationBoosts : [
        'Play your favorite music',
        'Promise yourself a reward after completion',
        'Visualize how good it will feel to finish'
      ],
      createdAt: new Date()
    };
  }

  /**
   * Complete a partial step with defaults
   */
  private completeStep(partial: Partial<TaskStep>, stepNumber: number): TaskStep {
    return {
      stepNumber,
      title: partial.title || `Step ${stepNumber}`,
      description: partial.description || '',
      estimatedDuration: partial.estimatedDuration || 10,
      energyRequired: partial.energyRequired || 'medium',
      dificulty: partial.dificulty || 'moderate',
      completionCriteria: partial.completionCriteria || 'Task completed',
      sensoryConsiderations: partial.sensoryConsiderations,
      tips: partial.tips,
      dopamineReward: partial.dopamineReward,
      isOptional: partial.isOptional || false,
      prerequisiteSteps: partial.prerequisiteSteps,
    };
  }

  /**
   * Save task breakdown to database
   */
  private async saveTaskBreakdown(conversationId: string, breakdown: TaskBreakdown): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('ai_suggestions')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          suggestion_type: 'task_breakdown',
          title: breakdown.taskTitle,
          description: breakdown.taskDescription,
          suggestion_data: breakdown,
          status: 'pending',
          confidence_score: 0.85,
        });

      if (error) {
        console.error('Error saving task breakdown:', error);
      }
    } catch (error) {
      console.error('Error in saveTaskBreakdown:', error);
    }
  }

  /**
   * Get task breakdowns for current user
   */
  async getTaskBreakdowns(limit: number = 10): Promise<TaskSuggestion[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('suggestion_type', 'task_breakdown')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows: AiSuggestionRow[] = data ?? [];

      return rows
        .filter((row) => row.suggestion_data)
        .map((row) => ({
        id: row.id,
        userId: row.user_id,
        taskBreakdown: row.suggestion_data as TaskBreakdown,
        status: row.status,
        implementedTaskId: row.implemented_id ?? undefined,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Error fetching task breakdowns:', error);
      return [];
    }
  }

  /**
   * Mark a task breakdown as implemented
   */
  async markAsImplemented(suggestionId: string, taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({
          status: 'implemented',
          implemented_id: taskId,
        })
        .eq('id', suggestionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking task as implemented:', error);
      throw error;
    }
  }

  /**
   * Refine an existing task breakdown based on user feedback
   */
  async refineBreakdown(
    originalBreakdown: TaskBreakdown,
    feedback: string
  ): Promise<TaskBreakdown> {
    try {
      const prompt = `I have this task breakdown:\n\n${JSON.stringify(originalBreakdown, null, 2)}\n\n` +
        `Please refine it based on this feedback: ${feedback}\n\n` +
        `Keep the same structure but adjust steps, durations, or strategies as needed.`;

      const context: ConversationContext = {
        conversationType: 'task_breakdown',
        contextData: {
          refinement: true,
          originalBreakdown,
          feedback,
        }
      };

      const response = await openAIService.chat(prompt, context);
      
      return this.parseTaskResponse(response.content, {
        taskTitle: originalBreakdown.taskTitle,
        taskDescription: originalBreakdown.taskDescription,
      });
    } catch (error) {
      console.error('Error refining breakdown:', error);
      throw error;
    }
  }
}

export const aiTaskService = new AITaskService();
