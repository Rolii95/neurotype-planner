import { supabase } from './supabase';

export interface BodyDoublingRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'video' | 'silent' | 'audio-only';
  created_by: string;
  is_public: boolean;
  max_participants: number;
  current_participants: number;
  tags?: string[];
  scheduled_start?: string;
  scheduled_end?: string;
  status: 'active' | 'scheduled' | 'ended';
  webrtc_room_id?: string;
  external_service_id?: string;
  external_service_name?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
  camera_enabled: boolean;
  microphone_enabled: boolean;
  peer_id?: string;
}

export interface ExternalServiceConfig {
  service_name: 'focusmate' | 'study-together' | 'flow-club' | 'custom';
  api_key?: string;
  webhook_url: string;
  sync_enabled: boolean;
}

export interface WebhookPayload {
  event: 'room.created' | 'room.updated' | 'room.ended' | 'participant.joined' | 'participant.left';
  room_id: string;
  user_id?: string;
  timestamp: string;
  data: Record<string, unknown>;
}

class BodyDoublingService {
  /**
   * Get all active rooms (public + user's private rooms)
   */
  async getRooms(userId?: string): Promise<BodyDoublingRoom[]> {
    try {
      let query = supabase
        .from('body_doubling_rooms')
        .select('*')
        .eq('status', 'active');

      if (userId) {
        query = query.or(`is_public.eq.true,created_by.eq.${userId}`);
      } else {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  }

  /**
   * Get room by ID
   */
  async getRoom(roomId: string): Promise<BodyDoublingRoom | null> {
    try {
      const { data, error } = await supabase
        .from('body_doubling_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching room:', error);
      return null;
    }
  }

  /**
   * Create a new room
   */
  async createRoom(
    userId: string,
    room: Omit<BodyDoublingRoom, 'id' | 'created_by' | 'current_participants' | 'created_at' | 'updated_at'>
  ): Promise<BodyDoublingRoom | null> {
    try {
      const { data, error } = await supabase
        .from('body_doubling_rooms')
        .insert({
          ...room,
          created_by: userId,
          current_participants: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger webhook if configured
      if (data.webhook_url) {
        await this.sendWebhook(data.webhook_url, {
          event: 'room.created',
          room_id: data.id,
          timestamp: new Date().toISOString(),
          data: { room: data },
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }

  /**
   * Update room
   */
  async updateRoom(
    roomId: string,
    updates: Partial<BodyDoublingRoom>
  ): Promise<BodyDoublingRoom | null> {
    try {
      const { data, error } = await supabase
        .from('body_doubling_rooms')
        .update(updates)
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;

      // Trigger webhook if configured
      if (data.webhook_url) {
        await this.sendWebhook(data.webhook_url, {
          event: 'room.updated',
          room_id: data.id,
          timestamp: new Date().toISOString(),
          data: { updates },
        });
      }

      return data;
    } catch (error) {
      console.error('Error updating room:', error);
      return null;
    }
  }

  /**
   * End a room
   */
  async endRoom(roomId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      
      const { error } = await supabase
        .from('body_doubling_rooms')
        .update({ status: 'ended' })
        .eq('id', roomId);

      if (error) throw error;

      // Remove all participants
      await supabase
        .from('room_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('is_active', true);

      // Trigger webhook
      if (room?.webhook_url) {
        await this.sendWebhook(room.webhook_url, {
          event: 'room.ended',
          room_id: roomId,
          timestamp: new Date().toISOString(),
          data: {},
        });
      }

      return true;
    } catch (error) {
      console.error('Error ending room:', error);
      return false;
    }
  }

  /**
   * Join a room
   */
  async joinRoom(
    roomId: string,
    userId: string,
    options?: { camera_enabled?: boolean; microphone_enabled?: boolean; peer_id?: string }
  ): Promise<RoomParticipant | null> {
    try {
      // Check if room is full
      const room = await this.getRoom(roomId);
      if (!room) throw new Error('Room not found');
      
      if (room.current_participants >= room.max_participants) {
        throw new Error('Room is full');
      }

      // Check if already in room
      const { data: existing } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (existing) {
        return existing as RoomParticipant;
      }

      // Join room
      const { data, error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: userId,
          is_active: true,
          camera_enabled: options?.camera_enabled ?? false,
          microphone_enabled: options?.microphone_enabled ?? false,
          peer_id: options?.peer_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger webhook
      if (room.webhook_url) {
        await this.sendWebhook(room.webhook_url, {
          event: 'participant.joined',
          room_id: roomId,
          user_id: userId,
          timestamp: new Date().toISOString(),
          data: { participant: data },
        });
      }

      return data as RoomParticipant;
    } catch (error) {
      console.error('Error joining room:', error);
      return null;
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);

      const { error } = await supabase
        .from('room_participants')
        .update({ 
          is_active: false, 
          left_at: new Date().toISOString() 
        })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      // Trigger webhook
      if (room?.webhook_url) {
        await this.sendWebhook(room.webhook_url, {
          event: 'participant.left',
          room_id: roomId,
          user_id: userId,
          timestamp: new Date().toISOString(),
          data: {},
        });
      }

      return true;
    } catch (error) {
      console.error('Error leaving room:', error);
      return false;
    }
  }

  /**
   * Get room participants
   */
  async getParticipants(roomId: string): Promise<RoomParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }

  /**
   * Update participant settings
   */
  async updateParticipant(
    participantId: string,
    updates: Partial<RoomParticipant>
  ): Promise<RoomParticipant | null> {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .update(updates)
        .eq('id', participantId)
        .select()
        .single();

      if (error) throw error;
      return data as RoomParticipant;
    } catch (error) {
      console.error('Error updating participant:', error);
      return null;
    }
  }

  /**
   * Subscribe to room changes (real-time)
   */
  subscribeToRoom(roomId: string, callback: (payload: unknown) => void) {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Configure external service integration
   */
  async configureExternalService(
    roomId: string,
    config: ExternalServiceConfig
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('body_doubling_rooms')
        .update({
          external_service_name: config.service_name,
          webhook_url: config.webhook_url,
        })
        .eq('id', roomId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error configuring external service:', error);
      return false;
    }
  }

  /**
   * Sync with external service (e.g., Focusmate, Study Together)
   */
  async syncWithExternalService(
    roomId: string,
    externalRoomId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('body_doubling_rooms')
        .update({ external_service_id: externalRoomId })
        .eq('id', roomId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error syncing with external service:', error);
      return false;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(url: string, payload: WebhookPayload): Promise<boolean> {
    try {
      // Queue webhook for async processing
      const { error } = await supabase
        .from('webhook_queue')
        .insert({
          webhook_url: url,
          payload: payload as unknown as Record<string, unknown>,
          event_type: payload.event,
          status: 'pending',
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error queueing webhook:', error);
      return false;
    }
  }

  /**
   * Process webhook queue (called by background job)
   */
  async processWebhookQueue(limit: number = 10): Promise<void> {
    try {
      const { data: webhooks, error } = await supabase
        .from('webhook_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('attempts', 3)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      if (!webhooks) return;

      for (const webhook of webhooks) {
        try {
          // Update status to processing
          await supabase
            .from('webhook_queue')
            .update({ status: 'processing', attempts: webhook.attempts + 1 })
            .eq('id', webhook.id);

          // Send webhook
          const response = await fetch(webhook.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': this.generateWebhookSignature(webhook.payload),
            },
            body: JSON.stringify(webhook.payload),
          });

          if (response.ok) {
            // Mark as completed
            await supabase
              .from('webhook_queue')
              .update({ 
                status: 'completed',
                processed_at: new Date().toISOString()
              })
              .eq('id', webhook.id);
          } else {
            // Mark as failed if max attempts reached
            const newStatus = webhook.attempts + 1 >= 3 ? 'failed' : 'pending';
            await supabase
              .from('webhook_queue')
              .update({ 
                status: newStatus,
                error_message: `HTTP ${response.status}: ${response.statusText}`,
                last_attempt_at: new Date().toISOString()
              })
              .eq('id', webhook.id);
          }
        } catch (error) {
          console.error(`Error processing webhook ${webhook.id}:`, error);
          
          // Mark as failed if max attempts reached
          const newStatus = webhook.attempts + 1 >= 3 ? 'failed' : 'pending';
          await supabase
            .from('webhook_queue')
            .update({ 
              status: newStatus,
              error_message: error instanceof Error ? error.message : 'Unknown error',
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', webhook.id);
        }
      }
    } catch (error) {
      console.error('Error processing webhook queue:', error);
    }
  }

  /**
   * Generate webhook signature for security
   */
  private generateWebhookSignature(payload: unknown): string {
    // In production, use HMAC-SHA256 with a secret key
    // For now, return a simple hash
    return btoa(JSON.stringify(payload)).slice(0, 32);
  }

  /**
   * Verify incoming webhook signature
   */
  verifyWebhookSignature(payload: unknown, signature: string): boolean {
    const expected = this.generateWebhookSignature(payload);
    return expected === signature;
  }

  /**
   * Handle incoming webhook from external service
   */
  async handleIncomingWebhook(
    serviceName: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Parse payload based on service
      switch (serviceName) {
        case 'focusmate':
          return await this.handleFocusmateWebhook(payload);
        case 'study-together':
          return await this.handleStudyTogetherWebhook(payload);
        case 'flow-club':
          return await this.handleFlowClubWebhook(payload);
        default:
          console.warn(`Unknown service: ${serviceName}`);
          return false;
      }
    } catch (error) {
      console.error('Error handling incoming webhook:', error);
      return false;
    }
  }

  private async handleFocusmateWebhook(payload: Record<string, unknown>): Promise<boolean> {
    // TODO: Implement Focusmate-specific webhook handling
    console.log('Focusmate webhook:', payload);
    return true;
  }

  private async handleStudyTogetherWebhook(payload: Record<string, unknown>): Promise<boolean> {
    // TODO: Implement Study Together-specific webhook handling
    console.log('Study Together webhook:', payload);
    return true;
  }

  private async handleFlowClubWebhook(payload: Record<string, unknown>): Promise<boolean> {
    // TODO: Implement Flow Club-specific webhook handling
    console.log('Flow Club webhook:', payload);
    return true;
  }
}

export const bodyDoublingService = new BodyDoublingService();
