// TypeScript fix for collaboration API
// This file provides type-safe wrappers for Supabase operations until schema is properly generated

import { supabase } from '../../../services/supabase';

// Re-export the shared Supabase client instance
export const collaborationSupabase = supabase;

// Helper functions for type-safe operations
export const collaborationDB = {
  // Board invitations
  async insertInvitation(data: {
    board_id: string;
    inviter_id: string;
    invitee_email: string;
    role: 'editor' | 'viewer';
    message?: string | null;
  }) {
    return await collaborationSupabase
      .from('board_invitations')
      .insert(data)
      .select()
      .single();
  },

  async updateInvitation(id: string, data: Record<string, any>) {
    return await collaborationSupabase
      .from('board_invitations')
      .update(data)
      .eq('id', id);
  },

  async getInvitation(token: string) {
    return await collaborationSupabase
      .from('board_invitations')
      .select('*')
      .eq('access_token', token)
      .single();
  },

  async getPendingInvitations(userEmail: string) {
    return await collaborationSupabase
      .from('board_invitations')
      .select(`
        *,
        collaborative_boards:board_id (
          id,
          title,
          description
        ),
        user_profiles:inviter_id (
          id,
          display_name,
          email
        )
      `)
      .eq('invitee_email', userEmail)
      .eq('status', 'pending');
  },

  // Board collaborators
  async insertCollaborator(data: {
    board_id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    invited_by?: string;
    status?: string;
  }) {
    return await collaborationSupabase
      .from('board_collaborators')
      .insert(data);
  },

  async updateCollaborator(id: string, data: Record<string, any>) {
    return await collaborationSupabase
      .from('board_collaborators')
      .update(data)
      .eq('id', id);
  },

  async getCollaborators(boardId: string) {
    return await collaborationSupabase
      .from('board_collaborators')
      .select(`
        *,
        user_profiles:user_id (
          id,
          display_name,
          email
        )
      `)
      .eq('board_id', boardId);
  },

  async deleteCollaborator(id: string) {
    return await collaborationSupabase
      .from('board_collaborators')
      .delete()
      .eq('id', id);
  },

  // Privacy settings
  async insertPrivacySettings(data: Record<string, any>) {
    return await collaborationSupabase
      .from('board_privacy_settings')
      .insert(data);
  },

  async updatePrivacySettings(boardId: string, data: Record<string, any>) {
    return await collaborationSupabase
      .from('board_privacy_settings')
      .update(data)
      .eq('board_id', boardId);
  },

  async getPrivacySettings(boardId: string) {
    return await collaborationSupabase
      .from('board_privacy_settings')
      .select('*')
      .eq('board_id', boardId)
      .single();
  },

  // Quick lock
  async insertQuickLock(data: Record<string, any>) {
    return await collaborationSupabase
      .from('board_quick_lock')
      .insert(data);
  },

  async updateQuickLock(boardId: string, data: Record<string, any>) {
    return await collaborationSupabase
      .from('board_quick_lock')
      .update(data)
      .eq('board_id', boardId);
  },

  async getQuickLock(boardId: string) {
    return await collaborationSupabase
      .from('board_quick_lock')
      .select('*')
      .eq('board_id', boardId)
      .single();
  },

  // Audit logs
  async insertAuditLog(data: Record<string, any>) {
    return await collaborationSupabase
      .from('audit_logs')
      .insert(data);
  },

  async getAuditLogs(boardId: string, options?: { limit?: number; offset?: number }) {
    let query = collaborationSupabase
      .from('audit_logs')
      .select('*')
      .eq('board_id', boardId)
      .order('timestamp', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    return await query;
  }
};