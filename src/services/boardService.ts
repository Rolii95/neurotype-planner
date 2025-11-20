import { supabase } from './supabase';
import { notificationService } from './notifications';
import * as metrics from './metrics';
import { getAllOffline } from './indexedQueue';

export interface Board {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  board_type: 'routine' | 'visual' | 'kanban' | 'timeline' | 'custom';
  layout: 'linear' | 'grid' | 'kanban' | 'timeline' | 'freeform';
  theme?: string;
  config: BoardConfig;
  schedule: BoardSchedule;
  visual_settings: VisualSettings;
  is_active: boolean;
  is_template: boolean;
  is_public: boolean;
  share_code?: string;
  tags: string[];
  total_executions: number;
  last_executed_at?: string;
  average_duration?: number;
  completion_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface BoardConfig {
  showProgress: boolean;
  showTimers: boolean;
  highlightTransitions: boolean;
  allowReordering: boolean;
  autoSave: boolean;
  pauseBetweenSteps: number;
}

export interface BoardSchedule {
  isScheduled: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  daysOfWeek?: number[];
  timeOfDay?: string;
  autoStart: boolean;
}

export interface VisualSettings {
  backgroundColor: string;
  cardStyle: 'modern' | 'classic' | 'minimal' | 'colorful';
  iconSet: 'default' | 'minimal' | 'playful' | 'professional';
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'normal' | 'spacious';
}

export interface BoardStep {
  id: string;
  board_id: string;
  step_type: 'task' | 'flexZone' | 'note' | 'transition' | 'break';
  title: string;
  description?: string;
  duration: number;
  order_index: number;
  visual_cues: VisualCues;
  transition_cue?: TransitionCue;
  freeform_data?: any;
  timer_settings: TimerSettings;
  neurotype_adaptations: any;
  is_flexible: boolean;
  is_optional: boolean;
  is_completed: boolean;
  execution_state: ExecutionState;
  created_at: string;
  updated_at: string;
}

export interface VisualCues {
  color: string;
  icon: string;
  emoji?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export interface TransitionCue {
  type: 'text' | 'audio' | 'visual' | 'mixed';
  text?: string;
  audioUrl?: string;
  visualUrl?: string;
  duration?: number;
  isRequired?: boolean;
}

export interface TimerSettings {
  autoStart: boolean;
  showWarningAt?: number;
  allowOverrun: boolean;
  endNotification: {
    type: 'visual' | 'audio' | 'vibration' | 'all';
    intensity: 'subtle' | 'normal' | 'prominent';
  };
}

export interface ExecutionState {
  status: 'pending' | 'active' | 'paused' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
  notes?: string;
}

export interface BoardExecution {
  id: string;
  board_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  current_step_id?: string;
  total_duration?: number;
  step_executions: any[];
  interruptions: any[];
  modifications: any[];
  status: 'in_progress' | 'completed' | 'abandoned' | 'paused';
  completion_percentage: number;
  satisfaction_rating?: number;
  difficulty_rating?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardInput {
  title: string;
  description?: string;
  board_type: Board['board_type'];
  layout?: Board['layout'];
  theme?: string;
  config?: Partial<BoardConfig>;
  schedule?: Partial<BoardSchedule>;
  visual_settings?: Partial<VisualSettings>;
  tags?: string[];
  steps?: Omit<BoardStep, 'id' | 'board_id' | 'created_at' | 'updated_at'>[];
}

export interface UpdateBoardInput {
  title?: string;
  description?: string;
  board_type?: Board['board_type'];
  layout?: Board['layout'];
  theme?: string;
  config?: Partial<BoardConfig>;
  schedule?: Partial<BoardSchedule>;
  visual_settings?: Partial<VisualSettings>;
  is_active?: boolean;
  is_public?: boolean;
  tags?: string[];
}

class BoardService {
  // ==================== BOARD CRUD ====================
  
  async createBoard(input: CreateBoardInput): Promise<Board | null> {
    const timerId = metrics.startTimer('board.create');
    metrics.incrementCounter('board.create.attempts');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const boardData = {
        user_id: user.id,
        title: input.title,
        description: input.description,
        board_type: input.board_type,
        layout: input.layout || 'linear',
        theme: input.theme || 'default',
        config: {
          showProgress: true,
          showTimers: true,
          highlightTransitions: true,
          allowReordering: true,
          autoSave: true,
          pauseBetweenSteps: 0,
          ...input.config,
        },
        schedule: {
          isScheduled: false,
          autoStart: false,
          ...input.schedule,
        },
        visual_settings: {
          backgroundColor: '#ffffff',
          cardStyle: 'modern',
          iconSet: 'default',
          fontSize: 'medium',
          spacing: 'normal',
          ...input.visual_settings,
        },
        tags: input.tags || [],
      };


      // Optimistic notification for creation
      const pendingNotif = await notificationService.createNotification({
        title: 'Creating board...',
        message: `Creating "${input.title}"`,
        type: 'update',
        priority: 'low',
        actionable: false,
      }).catch(() => null);

      const { data: board, error } = await supabase
        .from('boards')
        .insert(boardData)
        .select()
        .single();

      if (error) {
        // update notification to error if available
        if (pendingNotif) {
          await notificationService.updateNotification(pendingNotif.id, {
            title: 'Board creation failed',
            message: error.message || 'Failed to create board',
            type: 'warning',
            priority: 'urgent',
            actionable: false,
          }).catch((e) => console.warn('Failed to update pending notification:', e));
        }
        throw error;
      }

      // Add steps if provided
      if (input.steps && input.steps.length > 0 && board) {
        await this.addStepsToBoard(board.id, input.steps);
      }

      // update notification to success
      if (pendingNotif) {
        await notificationService.updateNotification(pendingNotif.id, {
          title: 'Board created',
          message: `Created "${board.title}"`,
          type: 'celebration',
          priority: 'low',
        }).catch((e) => console.warn('Failed to update pending notification:', e));
      }

      metrics.incrementCounter('board.create.success');
      metrics.endTimer(timerId, { boardId: board?.id });
      return board;
    } catch (error) {
      console.error('Error creating board:', error);
      metrics.incrementCounter('board.create.failures');
      try {
        const all = await getAllOffline();
        metrics.recordEvent('board.create.failure', { error: (error instanceof Error ? error.message : error), offlineQueueLength: all.length });
      } catch (e) {
        metrics.recordEvent('board.create.failure', { error: (error instanceof Error ? error.message : error) });
      }
      // show a failure notification if not already created
      try {
        await notificationService.createNotification({
          title: 'Board creation failed',
          message: error instanceof Error ? error.message : 'Failed to create board',
          type: 'warning',
          priority: 'urgent',
          actionable: false,
        });
      } catch (e) { console.warn('Failed to create failure notification:', e); }
      metrics.endTimer(timerId, { failed: true });
      return null;
    }
  }

  async getBoard(boardId: string): Promise<{ board: Board; steps: BoardStep[] } | null> {
    const timerId = metrics.startTimer('board.get');
    metrics.incrementCounter('board.get.attempts');
    try {
      const [{ data: board, error: boardError }, { data: steps, error: stepsError }] = await Promise.all([
        supabase.from('boards').select('*').eq('id', boardId).single(),
        supabase.from('board_steps').select('*').eq('board_id', boardId).order('order_index'),
      ]);

      if (boardError || stepsError) throw boardError || stepsError;
      if (!board) return null;
      metrics.incrementCounter('board.get.success');
      metrics.endTimer(timerId, { boardId });
      return { board, steps: steps || [] };
    } catch (error) {
      console.error('Error fetching board:', error);
      metrics.incrementCounter('board.get.failures');
      metrics.recordEvent('board.get.failure', { error: (error instanceof Error ? error.message : error), boardId });
      metrics.endTimer(timerId, { failed: true });
      return null;
    }
  }

  async getUserBoards(userId?: string): Promise<Board[]> {
    const timerId = metrics.startTimer('board.getUserBoards');
    metrics.incrementCounter('board.getUserBoards.attempts');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      metrics.incrementCounter('board.getUserBoards.success');
      metrics.endTimer(timerId, { count: (data || []).length });
      return data || [];
    } catch (error) {
      console.error('Error fetching user boards:', error);
      metrics.incrementCounter('board.getUserBoards.failures');
      metrics.recordEvent('board.getUserBoards.failure', { error: (error instanceof Error ? error.message : error) });
      metrics.endTimer(timerId, { failed: true });
      return [];
    }
  }

  async updateBoard(boardId: string, updates: UpdateBoardInput): Promise<Board | null> {
    try {
      const pendingNotif = await notificationService.createNotification({
        title: 'Updating board...',
        message: `Applying updates`,
        type: 'update',
        priority: 'low',
        actionable: false,
      }).catch(() => null);

      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', boardId)
        .select()
        .single();

      if (error) {
        if (pendingNotif) {
          await notificationService.updateNotification(pendingNotif.id, {
            title: 'Board update failed',
            message: error.message || 'Failed to update board',
            type: 'warning',
            priority: 'urgent',
          }).catch((e) => console.warn('Failed to update pending notification:', e));
        }
        throw error;
      }

      if (pendingNotif) {
        await notificationService.updateNotification(pendingNotif.id, {
          title: 'Board updated',
          message: `Updates applied`,
          type: 'update',
          priority: 'low',
        }).catch(() => null);
      }

      return data;
    } catch (error) {
      console.error('Error updating board:', error);
      try {
        await notificationService.createNotification({
          title: 'Board update failed',
          message: error instanceof Error ? error.message : 'Failed to update board',
          type: 'warning',
          priority: 'urgent',
          actionable: false,
        });
      } catch (e) { console.warn('Failed to create failure notification:', e); }
      return null;
    }
  }

  async deleteBoard(boardId: string): Promise<boolean> {
    try {
      const pendingNotif = await notificationService.createNotification({
        title: 'Deleting board...',
        message: `Deleting board`,
        type: 'update',
        priority: 'low',
        actionable: false,
      }).catch(() => null);

      const { error } = await supabase.from('boards').delete().eq('id', boardId);
      if (error) {
        if (pendingNotif) {
          await notificationService.updateNotification(pendingNotif.id, {
            title: 'Delete failed',
            message: error.message || 'Failed to delete board',
            type: 'warning',
            priority: 'urgent',
          }).catch((e) => console.warn('Failed to update pending notification:', e));
        }
        throw error;
      }

      if (pendingNotif) {
        await notificationService.updateNotification(pendingNotif.id, {
          title: 'Board deleted',
          message: `Board deleted`,
          type: 'update',
          priority: 'low',
        }).catch((e) => console.warn('Failed to update pending notification:', e));
      }

      return true;
    } catch (error) {
      console.error('Error deleting board:', error);
      try {
        await notificationService.createNotification({
          title: 'Delete failed',
          message: error instanceof Error ? error.message : 'Failed to delete board',
          type: 'warning',
          priority: 'urgent',
          actionable: false,
        });
      } catch (e) { console.warn('Failed to create failure notification:', e); }
      return false;
    }
  }

  async duplicateBoard(boardId: string, newTitle?: string): Promise<Board | null> {
    try {
      const result = await this.getBoard(boardId);
      if (!result) return null;

      const { board, steps } = result;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Create new board
      const newBoard = await this.createBoard({
        ...board,
        title: newTitle || `${board.title} (Copy)`,
        steps: steps.map(({ id, board_id, created_at, updated_at, ...step }) => step),
      });

      return newBoard;
    } catch (error) {
      console.error('Error duplicating board:', error);
      return null;
    }
  }

  // ==================== BOARD STEPS ====================

  async addStepsToBoard(boardId: string, steps: Omit<BoardStep, 'id' | 'board_id' | 'created_at' | 'updated_at'>[]): Promise<BoardStep[]> {
    const timerId = metrics.startTimer('board.addSteps');
    metrics.incrementCounter('board.addSteps.attempts');
    try {
      const stepsData = steps.map((step, index) => ({
        ...step,
        board_id: boardId,
        order_index: step.order_index ?? index,
      }));

      const { data, error } = await supabase
        .from('board_steps')
        .insert(stepsData)
        .select();

      if (error) throw error;
      metrics.incrementCounter('board.addSteps.success');
      metrics.endTimer(timerId, { added: data?.length ?? 0 });
      return data || [];
    } catch (error) {
      console.error('Error adding steps:', error);
      metrics.incrementCounter('board.addSteps.failures');
      metrics.recordEvent('board.addSteps.failure', { error: (error instanceof Error ? error.message : error), boardId });
      metrics.endTimer(timerId, { failed: true });
      return [];
    }
  }

  async updateStep(stepId: string, updates: Partial<BoardStep>): Promise<BoardStep | null> {
    try {
      const { data, error } = await supabase
        .from('board_steps')
        .update(updates)
        .eq('id', stepId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating step:', error);
      return null;
    }
  }

  async deleteStep(stepId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('board_steps').delete().eq('id', stepId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting step:', error);
      return false;
    }
  }

  async reorderSteps(boardId: string, stepIds: string[]): Promise<boolean> {
    try {
      const updates = stepIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from('board_steps')
          .update({ order_index: update.order_index })
          .eq('id', update.id)
          .eq('board_id', boardId);
      }

      return true;
    } catch (error) {
      console.error('Error reordering steps:', error);
      return false;
    }
  }

  // ==================== BOARD EXECUTION ====================

  async startExecution(boardId: string): Promise<BoardExecution | null> {
    const timerId = metrics.startTimer('board.startExecution');
    metrics.incrementCounter('board.startExecution.attempts');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('board_executions')
        .insert({
          board_id: boardId,
          user_id: user.id,
          status: 'in_progress',
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      metrics.incrementCounter('board.startExecution.success');
      metrics.endTimer(timerId, { executionId: data?.id });
      return data;
    } catch (error) {
      console.error('Error starting execution:', error);
      metrics.incrementCounter('board.startExecution.failures');
      metrics.recordEvent('board.startExecution.failure', { error: (error instanceof Error ? error.message : error), boardId });
      metrics.endTimer(timerId, { failed: true });
      return null;
    }
  }

  async updateExecution(executionId: string, updates: Partial<BoardExecution>): Promise<BoardExecution | null> {
    try {
      const { data, error } = await supabase
        .from('board_executions')
        .update(updates)
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating execution:', error);
      return null;
    }
  }

  async completeExecution(
    executionId: string,
    satisfaction?: number,
    difficulty?: number,
    notes?: string
  ): Promise<BoardExecution | null> {
    try {
      const { data, error } = await supabase
        .from('board_executions')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          completion_percentage: 100,
          satisfaction_rating: satisfaction,
          difficulty_rating: difficulty,
          notes,
        })
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error completing execution:', error);
      return null;
    }
  }

  async getBoardExecutions(boardId: string, limit = 10): Promise<BoardExecution[]> {
    try {
      const { data, error } = await supabase
        .from('board_executions')
        .select('*')
        .eq('board_id', boardId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching executions:', error);
      return [];
    }
  }

  // ==================== SHARING ====================

  async generateShareCode(boardId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('generate_share_code');
      if (error) throw error;

      const shareCode = data as string;
      await this.updateBoard(boardId, { is_public: true });
      await supabase.from('boards').update({ share_code: shareCode }).eq('id', boardId);

      return shareCode;
    } catch (error) {
      console.error('Error generating share code:', error);
      return null;
    }
  }

  async getBoardByShareCode(shareCode: string): Promise<{ board: Board; steps: BoardStep[] } | null> {
    try {
      const { data: board, error } = await supabase
        .from('boards')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_public', true)
        .single();

      if (error || !board) return null;

      return this.getBoard(board.id);
    } catch (error) {
      console.error('Error fetching board by share code:', error);
      return null;
    }
  }

  // ==================== TEMPLATES ====================

  async saveAsTemplate(boardId: string, name: string, category: string): Promise<boolean> {
    try {
      const result = await this.getBoard(boardId);
      if (!result) return false;

      const { board, steps } = result;
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('board_templates').insert({
        name,
        category,
        template_data: { board, steps },
        author_id: user?.id,
        estimated_duration: steps.reduce((sum, step) => sum + step.duration, 0),
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      return false;
    }
  }

  async getTemplates(category?: string): Promise<any[]> {
    try {
      let query = supabase.from('board_templates').select('*').eq('is_public', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  async createFromTemplate(templateId: string, title?: string): Promise<Board | null> {
    try {
      const { data: template, error } = await supabase
        .from('board_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !template) return null;

      const { board: boardData, steps } = template.template_data;
      
      const newBoard = await this.createBoard({
        ...boardData,
        title: title || boardData.title,
        steps,
      });

      // Increment usage count
      await supabase
        .from('board_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId);

      return newBoard;
    } catch (error) {
      console.error('Error creating from template:', error);
      return null;
    }
  }

  // Create a user-owned snapshot of a board template so users can branch without
  // modifying the original template. The snapshot is stored in `board_snapshots`
  // and protected by Row Level Security policies (owner-only updates).
  async createSnapshotFromTemplate(templateId: string, title?: string): Promise<{ id: string; owner_id: string; created_at: string } | null> {
    try {
      const { data: template, error } = await supabase
        .from('board_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !template) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const snapshotPayload = {
        template_id: templateId,
        owner_id: user.id,
        snapshot_data: template.template_data,
        title: title || template.name || null,
        is_public: false,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('board_snapshots')
        .insert(snapshotPayload)
        .select('id, owner_id, created_at')
        .single();

      if (insertError) {
        console.error('Failed to insert board snapshot:', insertError);
        return null;
      }

      return inserted || null;
    } catch (err) {
      console.error('Error creating snapshot from template:', err);
      return null;
    }
  }
}

export const boardService = new BoardService();
