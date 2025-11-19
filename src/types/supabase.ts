export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string
          neurotype: string
          age_group: string
          preferences: Json
          created_at: string
          updated_at: string
          last_active_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name: string
          neurotype: string
          age_group: string
          preferences: Json
          created_at?: string
          updated_at?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string
          neurotype?: string
          age_group?: string
          preferences?: Json
          created_at?: string
          updated_at?: string
          last_active_at?: string
        }
      }
      collaborative_boards: {
        Row: {
          id: string
          title: string
          description: string | null
          owner_id: string
          is_private: boolean
          privacy_level: string
          allow_public_view: boolean
          allow_public_edit: boolean
          require_approval_for_edits: boolean
          allow_copy: boolean
          allow_download: boolean
          allow_print: boolean
          expiration_date: string | null
          max_views: number | null
          current_views: number
          restricted_fields: string[]
          is_locked: boolean
          locked_by: string | null
          locked_at: string | null
          view_count: number
          edit_count: number
          collaborator_count: number
          created_at: string
          updated_at: string
          last_modified_by: string | null
          version: number
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          owner_id: string
          is_private?: boolean
          privacy_level?: string
          allow_public_view?: boolean
          allow_public_edit?: boolean
          require_approval_for_edits?: boolean
          allow_copy?: boolean
          allow_download?: boolean
          allow_print?: boolean
          expiration_date?: string | null
          max_views?: number | null
          current_views?: number
          restricted_fields?: string[]
          is_locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          view_count?: number
          edit_count?: number
          collaborator_count?: number
          created_at?: string
          updated_at?: string
          last_modified_by?: string | null
          version?: number
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          owner_id?: string
          is_private?: boolean
          privacy_level?: string
          allow_public_view?: boolean
          allow_public_edit?: boolean
          require_approval_for_edits?: boolean
          allow_copy?: boolean
          allow_download?: boolean
          allow_print?: boolean
          expiration_date?: string | null
          max_views?: number | null
          current_views?: number
          restricted_fields?: string[]
          is_locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          view_count?: number
          edit_count?: number
          collaborator_count?: number
          created_at?: string
          updated_at?: string
          last_modified_by?: string | null
          version?: number
        }
      }
      board_collaborators: {
        Row: {
          id: string
          board_id: string
          user_id: string
          role: string
          can_edit: boolean
          can_delete: boolean
          can_invite: boolean
          can_export: boolean
          can_view_history: boolean
          invited_by: string | null
          invited_at: string
          accepted_at: string | null
          status: string
          last_active_at: string
        }
        Insert: {
          id?: string
          board_id: string
          user_id: string
          role: string
          can_edit?: boolean
          can_delete?: boolean
          can_invite?: boolean
          can_export?: boolean
          can_view_history?: boolean
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
          status?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          user_id?: string
          role?: string
          can_edit?: boolean
          can_delete?: boolean
          can_invite?: boolean
          can_export?: boolean
          can_view_history?: boolean
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
          status?: string
          last_active_at?: string
        }
      }
      board_invitations: {
        Row: {
          id: string
          board_id: string
          inviter_id: string
          invitee_email: string
          invitee_id: string | null
          role: string
          message: string | null
          access_token: string
          status: string
          created_at: string
          expires_at: string
          accepted_at: string | null
          declined_at: string | null
          revoked_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          inviter_id: string
          invitee_email: string
          invitee_id?: string | null
          role: string
          message?: string | null
          access_token?: string
          status?: string
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
          declined_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          inviter_id?: string
          invitee_email?: string
          invitee_id?: string | null
          role?: string
          message?: string | null
          access_token?: string
          status?: string
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
          declined_at?: string | null
          revoked_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          board_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          board_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          board_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      quick_captures: {
        Row: {
          id: string
          user_id: string
          content: string
          type: string
          context: Json | null
          processed: boolean
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          type: string
          context?: Json | null
          processed?: boolean
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          type?: string
          context?: Json | null
          processed?: boolean
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_activity: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          entity_id: string | null
          entity_type: string | null
          duration_minutes: number | null
          context: Json
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          entity_id?: string | null
          entity_type?: string | null
          duration_minutes?: number | null
          context: Json
          started_at: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          entity_id?: string | null
          entity_type?: string | null
          duration_minutes?: number | null
          context?: Json
          started_at?: string
          ended_at?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          notifications: Json
          privacy: Json
          accessibility: Json
          appearance: Json
          productivity: Json
          collaboration: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notifications?: Json
          privacy?: Json
          accessibility?: Json
          appearance?: Json
          productivity?: Json
          collaboration?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notifications?: Json
          privacy?: Json
          accessibility?: Json
          appearance?: Json
          productivity?: Json
          collaboration?: Json
          created_at?: string
          updated_at?: string
        }
      }
      board_privacy_settings: {
        Row: {
          id: string
          board_id: string
          board_visibility: string
          task_visibility: string
          enable_quick_lock: boolean
          auto_lock_timeout: number
          mask_sensitive_content: boolean
          enable_audit_log: boolean
          allow_data_export: boolean
          data_retention_days: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          board_id: string
          board_visibility: string
          task_visibility: string
          enable_quick_lock?: boolean
          auto_lock_timeout?: number
          mask_sensitive_content?: boolean
          enable_audit_log?: boolean
          allow_data_export?: boolean
          data_retention_days?: number
          updated_at?: string
          updated_by?: string
        }
        Update: {
          id?: string
          board_id?: string
          board_visibility?: string
          task_visibility?: string
          enable_quick_lock?: boolean
          auto_lock_timeout?: number
          mask_sensitive_content?: boolean
          enable_audit_log?: boolean
          allow_data_export?: boolean
          data_retention_days?: number
          updated_at?: string
          updated_by?: string
        }
      }
      board_quick_lock: {
        Row: {
          id: string
          board_id: string
          enabled: boolean
          is_active: boolean
          activated_at: string | null
          activated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_id: string
          enabled?: boolean
          is_active?: boolean
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          enabled?: boolean
          is_active?: boolean
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          priority: string
          estimated_duration: number
          actual_duration: number | null
          buffer_time: number
          status: string
          due_date: string | null
          scheduled_at: string | null
          completed_at: string | null
          tags: string[]
          energy_required: string
          focus_required: string
          sensory_considerations: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category: string
          priority: string
          estimated_duration: number
          actual_duration?: number | null
          buffer_time: number
          status?: string
          due_date?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          tags?: string[]
          energy_required: string
          focus_required: string
          sensory_considerations?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string
          priority?: string
          estimated_duration?: number
          actual_duration?: number | null
          buffer_time?: number
          status?: string
          due_date?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          tags?: string[]
          energy_required?: string
          focus_required?: string
          sensory_considerations?: Json
          created_at?: string
          updated_at?: string
        }
      }
      routines: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          type: string
          is_active: boolean
          is_template: boolean
          flexibility: string
          schedule: Json
          adaptive_rules: Json
          visual_board: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          type: string
          is_active?: boolean
          is_template?: boolean
          flexibility: string
          schedule: Json
          adaptive_rules?: Json
          visual_board?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          type?: string
          is_active?: boolean
          is_template?: boolean
          flexibility?: string
          schedule?: Json
          adaptive_rules?: Json
          visual_board?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      routine_tasks: {
        Row: {
          id: string
          routine_id: string
          task_id: string
          order: number
          is_optional: boolean
          estimated_duration: number
          buffer_time: number
          conditions: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          task_id: string
          order: number
          is_optional?: boolean
          estimated_duration: number
          buffer_time: number
          conditions?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          task_id?: string
          order?: number
          is_optional?: boolean
          estimated_duration?: number
          buffer_time?: number
          conditions?: Json | null
          created_at?: string
        }
      }
      mood_entries: {
        Row: {
          id: string
          user_id: string
          timestamp: string
          mood: number
          energy: number
          focus: number
          anxiety: number
          stress: number
          motivation: number
          notes: string | null
          triggers: string[] | null
          context: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timestamp: string
          mood: number
          energy: number
          focus: number
          anxiety: number
          stress: number
          motivation: number
          notes?: string | null
          triggers?: string[] | null
          context?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timestamp?: string
          mood?: number
          energy?: number
          focus?: number
          anxiety?: number
          stress?: number
          motivation?: number
          notes?: string | null
          triggers?: string[] | null
          context?: Json | null
          created_at?: string
        }
      }
      ai_insights: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          description: string
          confidence: number
          relevance: number
          actionable: boolean
          suggestions: Json
          data: Json
          generated_at: string
          dismissed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          description: string
          confidence: number
          relevance: number
          actionable?: boolean
          suggestions: Json
          data: Json
          generated_at?: string
          dismissed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          description?: string
          confidence?: number
          relevance?: number
          actionable?: boolean
          suggestions?: Json
          data?: Json
          generated_at?: string
          dismissed_at?: string | null
        }
      }
      shared_boards: {
        Row: {
          id: string
          board_id: string
          owner_id: string
          shared_with: Json
          permissions: Json
          is_public: boolean
          share_code: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          board_id: string
          owner_id: string
          shared_with: Json
          permissions: Json
          is_public?: boolean
          share_code?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          owner_id?: string
          shared_with?: Json
          permissions?: Json
          is_public?: boolean
          share_code?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          priority: string
          actionable: boolean
          actions: Json | null
          scheduled_for: string | null
          delivered_at: string | null
          read_at: string | null
          dismissed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          priority: string
          actionable?: boolean
          actions?: Json | null
          scheduled_for?: string | null
          delivered_at?: string | null
          read_at?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          priority?: string
          actionable?: boolean
          actions?: Json | null
          scheduled_for?: string | null
          delivered_at?: string | null
          read_at?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
      }
      app_events: {
        Row: {
          id: string
          user_id: string | null
          type: string
          source: string
          data: Json
          timestamp: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          source: string
          data: Json
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          source?: string
          data?: Json
          timestamp?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      neurotype: 'adhd' | 'autism' | 'executive-function' | 'anxiety' | 'depression' | 'learning-difference' | 'neurotypical' | 'multiple' | 'exploring'
      age_group: 'child' | 'teen' | 'young-adult' | 'adult' | 'senior'
      task_category: 'work' | 'personal' | 'health' | 'social' | 'creative' | 'learning' | 'maintenance' | 'self-care'
      priority: 'low' | 'medium' | 'high' | 'urgent'
      task_status: 'not-started' | 'in-progress' | 'blocked' | 'completed' | 'cancelled' | 'deferred'
      energy_level: 'low' | 'medium' | 'high'
      focus_level: 'low' | 'medium' | 'high' | 'deep'
      routine_type: 'morning' | 'evening' | 'workday' | 'weekend' | 'transition' | 'crisis' | 'custom'
      flexibility_level: 'rigid' | 'structured' | 'flexible' | 'adaptive'
      insight_type: 'pattern-recognition' | 'optimization' | 'warning' | 'celebration' | 'adaptation' | 'coaching'
      suggestion_type: 'routine-adjustment' | 'task-optimization' | 'schedule-change' | 'break-suggestion' | 'environment-modification' | 'tool-recommendation'
      notification_type: 'reminder' | 'celebration' | 'suggestion' | 'warning' | 'update' | 'social'
      event_type: 'task-completed' | 'routine-started' | 'mood-logged' | 'insight-generated' | 'goal-achieved' | 'milestone-reached' | 'pattern-detected' | 'disruption-occurred'
      event_source: 'user-action' | 'system' | 'ai' | 'timer' | 'external'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}