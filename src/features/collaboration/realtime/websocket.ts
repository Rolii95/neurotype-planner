import React from 'react';
// Note: socket.io-client would need to be installed: npm install socket.io-client @types/socket.io-client
// For now, creating mock implementation for demonstration
import type { 
  RealtimeEvent, 
  WebSocketMessage, 
  ActiveUser, 
  CollaborativeTask, 
  CollaborativeBoard 
} from '../types';

// Mock Socket.IO types for demonstration
interface Socket<ServerEvents = any, ClientEvents = any> {
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  disconnect: () => void;
}

// Mock Socket.IO implementation
const io = (url: string, options: any): Socket => {
  console.log('Mock WebSocket connection to:', url, options);
  
  const eventHandlers = new Map<string, ((data: any) => void)[]>();
  
  return {
    emit: (event: string, data: any) => {
      console.log('Emit event:', event, data);
    },
    on: (event: string, handler: (data: any) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
    },
    disconnect: () => {
      console.log('Mock socket disconnected');
    }
  };
};

// WebSocket event types
export interface ClientEvents {
  join_board: (boardId: string) => void;
  leave_board: (boardId: string) => void;
  update_cursor: (data: { boardId: string; x: number; y: number; userId: string }) => void;
  start_editing: (data: { boardId: string; taskId: string; userId: string }) => void;
  stop_editing: (data: { boardId: string; taskId: string; userId: string }) => void;
  task_updated: (data: { boardId: string; task: Partial<CollaborativeTask>; userId: string }) => void;
  board_updated: (data: { boardId: string; changes: Partial<CollaborativeBoard>; userId: string }) => void;
  send_message: (data: { boardId: string; message: string; userId: string }) => void;
  presence_update: (data: { boardId: string; status: 'online' | 'away' | 'offline'; userId: string }) => void;
}

export interface ServerEvents {
  user_joined: (data: { boardId: string; user: ActiveUser }) => void;
  user_left: (data: { boardId: string; userId: string }) => void;
  cursor_moved: (data: { boardId: string; x: number; y: number; userId: string; userName: string; color: string }) => void;
  editing_started: (data: { boardId: string; taskId: string; userId: string; userName: string }) => void;
  editing_stopped: (data: { boardId: string; taskId: string; userId: string }) => void;
  task_update: (data: { boardId: string; task: Partial<CollaborativeTask>; userId: string; userName: string }) => void;
  board_update: (data: { boardId: string; changes: Partial<CollaborativeBoard>; userId: string; userName: string }) => void;
  message_received: (data: { boardId: string; message: string; userId: string; userName: string; timestamp: string }) => void;
  presence_changed: (data: { boardId: string; userId: string; status: 'online' | 'away' | 'offline' }) => void;
  conflict_detected: (data: { boardId: string; taskId: string; conflictType: 'edit' | 'delete' | 'move'; users: string[] }) => void;
  error: (data: { message: string; code?: string }) => void;
  reconnected: () => void;
  disconnected: () => void;
}

/**
 * Real-time collaboration service using WebSockets
 * Handles presence, live editing, and conflict resolution
 */
export class RealtimeCollaborationService {
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private currentBoardId: string | null = null;
  private currentUserId: string | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  // Event listeners
  private eventListeners = new Map<string, Set<Function>>();
  
  // Conflict resolution
  private conflictQueue = new Map<string, any[]>();
  private editingLocks = new Map<string, { userId: string; timestamp: number }>();
  
  // Presence tracking
  private presenceTimer: NodeJS.Timeout | null = null;
  private lastActivity = Date.now();

  constructor(private serverUrl: string, private authToken: string) {
    this.setupPresenceTracking();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    try {
      this.connectionStatus = 'connecting';
      
      this.socket = io(this.serverUrl, {
        auth: {
          token: this.authToken
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        retries: this.maxReconnectAttempts
      });

      await this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        this.socket!.on('connect', () => {
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
          this.emit('connection_status', { status: 'connected' });
          resolve();
        });

        this.socket!.on('connect_error', (error: any) => {
          this.connectionStatus = 'error';
          this.emit('connection_status', { status: 'error', error: error.message });
          reject(error);
        });

        this.socket!.on('disconnect', () => {
          this.connectionStatus = 'disconnected';
          this.emit('connection_status', { status: 'disconnected' });
          this.handleReconnection();
        });
      });
    } catch (error) {
      this.connectionStatus = 'error';
      console.error('WebSocket connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.currentBoardId) {
      this.leaveBoard(this.currentBoardId);
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }

    this.connectionStatus = 'disconnected';
    this.emit('connection_status', { status: 'disconnected' });
  }

  /**
   * Join a board for real-time collaboration
   */
  async joinBoard(boardId: string, userId: string): Promise<void> {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    // Leave current board if different
    if (this.currentBoardId && this.currentBoardId !== boardId) {
      await this.leaveBoard(this.currentBoardId);
    }

    this.currentBoardId = boardId;
    this.currentUserId = userId;

    this.socket.emit('join_board', boardId);
    this.emit('board_joined', { boardId, userId });
  }

  /**
   * Leave current board
   */
  async leaveBoard(boardId: string): Promise<void> {
    if (!this.socket || this.currentBoardId !== boardId) {
      return;
    }

    this.socket.emit('leave_board', boardId);
    this.currentBoardId = null;
    this.currentUserId = null;
    this.editingLocks.clear();
    this.emit('board_left', { boardId });
  }

  /**
   * Update cursor position for live cursor tracking
   */
  updateCursor(x: number, y: number): void {
    if (!this.socket || !this.currentBoardId || !this.currentUserId) {
      return;
    }

    this.socket.emit('update_cursor', {
      boardId: this.currentBoardId,
      x,
      y,
      userId: this.currentUserId
    });

    this.updateActivity();
  }

  /**
   * Start editing a task (acquire lock)
   */
  async startEditingTask(taskId: string): Promise<boolean> {
    if (!this.socket || !this.currentBoardId || !this.currentUserId) {
      throw new Error('Not connected to board');
    }

    // Check if task is already being edited
    const existingLock = this.editingLocks.get(taskId);
    if (existingLock && existingLock.userId !== this.currentUserId) {
      // Check if lock is stale (older than 30 seconds)
      if (Date.now() - existingLock.timestamp < 30000) {
        return false; // Task is being edited by someone else
      }
    }

    // Acquire lock
    this.editingLocks.set(taskId, {
      userId: this.currentUserId,
      timestamp: Date.now()
    });

    this.socket.emit('start_editing', {
      boardId: this.currentBoardId,
      taskId,
      userId: this.currentUserId
    });

    this.updateActivity();
    return true;
  }

  /**
   * Stop editing a task (release lock)
   */
  stopEditingTask(taskId: string): void {
    if (!this.socket || !this.currentBoardId || !this.currentUserId) {
      return;
    }

    // Release lock
    this.editingLocks.delete(taskId);

    this.socket.emit('stop_editing', {
      boardId: this.currentBoardId,
      taskId,
      userId: this.currentUserId
    });

    this.updateActivity();
  }

  /**
   * Broadcast task update with conflict resolution
   */
  async updateTask(task: Partial<CollaborativeTask>): Promise<void> {
    if (!this.socket || !this.currentBoardId || !this.currentUserId) {
      throw new Error('Not connected to board');
    }

    // Check for editing lock
    if (task.id) {
      const lock = this.editingLocks.get(task.id);
      if (lock && lock.userId !== this.currentUserId) {
        throw new Error('Task is being edited by another user');
      }
    }

    // Apply optimistic update locally
    this.emit('task_update_local', { task, userId: this.currentUserId });

    // Send to server
    this.socket.emit('task_updated', {
      boardId: this.currentBoardId,
      task,
      userId: this.currentUserId
    });

    this.updateActivity();
  }

  /**
   * Broadcast board update
   */
  async updateBoard(changes: Partial<CollaborativeBoard>): Promise<void> {
    if (!this.socket || !this.currentBoardId || !this.currentUserId) {
      throw new Error('Not connected to board');
    }

    this.socket.emit('board_updated', {
      boardId: this.currentBoardId,
      changes,
      userId: this.currentUserId
    });

    this.updateActivity();
  }

  /**
   * Send chat message
   */
  sendMessage(message: string): void {
    if (!this.socket || !this.currentBoardId || !this.currentUserId) {
      throw new Error('Not connected to board');
    }

    this.socket.emit('send_message', {
      boardId: this.currentBoardId,
      message,
      userId: this.currentUserId
    });

    this.updateActivity();
  }

  /**
   * Update presence status
   */
  updatePresence(status: 'online' | 'away' | 'offline'): void {
    if (!this.socket || !this.currentBoardId || !this.currentUserId) {
      return;
    }

    this.socket.emit('presence_update', {
      boardId: this.currentBoardId,
      status,
      userId: this.currentUserId
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  /**
   * Check if task is being edited by someone else
   */
  isTaskBeingEdited(taskId: string): { isEditing: boolean; userId?: string; userName?: string } {
    const lock = this.editingLocks.get(taskId);
    if (!lock || lock.userId === this.currentUserId) {
      return { isEditing: false };
    }

    // Check if lock is stale
    if (Date.now() - lock.timestamp > 30000) {
      this.editingLocks.delete(taskId);
      return { isEditing: false };
    }

    return { isEditing: true, userId: lock.userId };
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(listener);
    };
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // User presence events
    this.socket.on('user_joined', (data: any) => {
      this.emit('user_joined', data);
    });

    this.socket.on('user_left', (data: any) => {
      this.emit('user_left', data);
    });

    // Cursor tracking
    this.socket.on('cursor_moved', (data: any) => {
      this.emit('cursor_moved', data);
    });

    // Editing state
    this.socket.on('editing_started', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.editingLocks.set(data.taskId, {
          userId: data.userId,
          timestamp: Date.now()
        });
      }
      this.emit('editing_started', data);
    });

    this.socket.on('editing_stopped', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.editingLocks.delete(data.taskId);
      }
      this.emit('editing_stopped', data);
    });

    // Content updates
    this.socket.on('task_update', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.handleRemoteTaskUpdate(data);
      }
    });

    this.socket.on('board_update', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.emit('board_update_remote', data);
      }
    });

    // Chat messages
    this.socket.on('message_received', (data: any) => {
      this.emit('message_received', data);
    });

    // Presence updates
    this.socket.on('presence_changed', (data: any) => {
      this.emit('presence_changed', data);
    });

    // Conflict resolution
    this.socket.on('conflict_detected', (data: any) => {
      this.handleConflict(data);
    });

    // Error handling
    this.socket.on('error', (data: any) => {
      console.error('WebSocket error:', data);
      this.emit('error', data);
    });

    // Connection events
    this.socket.on('reconnected', () => {
      this.emit('reconnected', {});
      // Rejoin current board if connected
      if (this.currentBoardId && this.currentUserId) {
        this.joinBoard(this.currentBoardId, this.currentUserId);
      }
    });

    this.socket.on('disconnected', () => {
      this.emit('disconnected', {});
    });
  }

  /**
   * Handle remote task updates with conflict resolution
   */
  private handleRemoteTaskUpdate(data: any): void {
    const { task, userId, userName } = data;
    
    // Check for conflicts
    if (this.editingLocks.has(task.id) && this.editingLocks.get(task.id)?.userId === this.currentUserId) {
      // Current user is editing - queue the update
      this.queueConflictingUpdate(task.id, { task, userId, userName, type: 'task_update' });
      this.emit('conflict_detected', {
        taskId: task.id,
        conflictType: 'edit',
        remoteUser: { userId, userName },
        localUpdate: true
      });
    } else {
      // Apply remote update
      this.emit('task_update_remote', { task, userId, userName });
    }
  }

  /**
   * Handle conflict resolution
   */
  private handleConflict(data: any): void {
    const { boardId, taskId, conflictType, users } = data;
    
    // Store conflict for resolution
    if (!this.conflictQueue.has(taskId)) {
      this.conflictQueue.set(taskId, []);
    }
    
    this.conflictQueue.get(taskId)!.push({
      type: conflictType,
      users,
      timestamp: Date.now(),
      boardId
    });

    this.emit('conflict_detected', data);
  }

  /**
   * Queue conflicting updates for later resolution
   */
  private queueConflictingUpdate(taskId: string, update: any): void {
    if (!this.conflictQueue.has(taskId)) {
      this.conflictQueue.set(taskId, []);
    }
    this.conflictQueue.get(taskId)!.push(update);
  }

  /**
   * Resolve conflicts for a task
   */
  resolveConflict(taskId: string, resolution: 'accept_remote' | 'keep_local' | 'merge'): void {
    const conflicts = this.conflictQueue.get(taskId);
    if (!conflicts || conflicts.length === 0) return;

    conflicts.forEach(conflict => {
      switch (resolution) {
        case 'accept_remote':
          if (conflict.type === 'task_update') {
            this.emit('task_update_remote', conflict);
          }
          break;
        case 'keep_local':
          // Do nothing - keep local changes
          break;
        case 'merge':
          // Implement merge logic based on conflict type
          this.mergeConflict(conflict);
          break;
      }
    });

    this.conflictQueue.delete(taskId);
  }

  /**
   * Merge conflicting changes
   */
  private mergeConflict(conflict: any): void {
    // Implement intelligent merging based on field types
    this.emit('conflict_resolved', { conflict, resolution: 'merged' });
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('connection_status', { status: 'failed', message: 'Max reconnection attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    setTimeout(() => {
      this.connect().catch(error => {
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      });
    }, delay);
  }

  /**
   * Setup presence tracking
   */
  private setupPresenceTracking(): void {
    // Track user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });

    // Update presence status based on activity
    this.presenceTimer = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      
      if (timeSinceActivity > 300000) { // 5 minutes
        this.updatePresence('away');
      } else if (timeSinceActivity > 600000) { // 10 minutes
        this.updatePresence('offline');
      } else {
        this.updatePresence('online');
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }
}

/**
 * Hook for real-time collaboration
 */
export const useRealtimeCollaboration = (
  boardId: string | null,
  userId: string | null,
  authToken: string
) => {
  const [service] = React.useState(() => 
    new RealtimeCollaborationService(
      import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001',
      authToken
    )
  );

  const [connectionStatus, setConnectionStatus] = React.useState<string>('disconnected');
  const [activeUsers, setActiveUsers] = React.useState<ActiveUser[]>([]);
  const [cursors, setCursors] = React.useState<Map<string, { x: number; y: number; name: string; color: string }>>(new Map());
  const [editingUsers, setEditingUsers] = React.useState<Map<string, { userId: string; userName: string }>>(new Map());
  const [conflicts, setConflicts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Connection status
    unsubscribers.push(
      service.on('connection_status', (data: any) => {
        setConnectionStatus(data.status);
      })
    );

    // User presence
    unsubscribers.push(
      service.on('user_joined', (data: any) => {
        setActiveUsers(prev => [...prev.filter(u => u.userId !== data.user.userId), data.user]);
      })
    );

    unsubscribers.push(
      service.on('user_left', (data: any) => {
        setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(data.userId);
          return newCursors;
        });
        setEditingUsers(prev => {
          const newEditing = new Map(prev);
          newEditing.delete(data.userId);
          return newEditing;
        });
      })
    );

    // Cursor tracking
    unsubscribers.push(
      service.on('cursor_moved', (data: any) => {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(data.userId, {
            x: data.x,
            y: data.y,
            name: data.userName,
            color: data.color
          });
          return newCursors;
        });
      })
    );

    // Editing state
    unsubscribers.push(
      service.on('editing_started', (data: any) => {
        setEditingUsers(prev => {
          const newEditing = new Map(prev);
          newEditing.set(data.taskId, { userId: data.userId, userName: data.userName });
          return newEditing;
        });
      })
    );

    unsubscribers.push(
      service.on('editing_stopped', (data: any) => {
        setEditingUsers(prev => {
          const newEditing = new Map(prev);
          newEditing.delete(data.taskId);
          return newEditing;
        });
      })
    );

    // Conflicts
    unsubscribers.push(
      service.on('conflict_detected', (data: any) => {
        setConflicts(prev => [...prev, { ...data, id: Date.now() }]);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [service]);

  // Connect/disconnect based on board and user
  React.useEffect(() => {
    if (boardId && userId) {
      service.connect()
        .then(() => service.joinBoard(boardId, userId))
        .catch(error => console.error('Failed to connect to collaboration service:', error));
    }

    return () => {
      if (boardId) {
        service.leaveBoard(boardId);
      }
    };
  }, [boardId, userId, service]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      service.disconnect();
    };
  }, [service]);

  return {
    service,
    connectionStatus,
    activeUsers,
    cursors,
    editingUsers,
    conflicts,
    isConnected: connectionStatus === 'connected',
    resolveConflict: (taskId: string, resolution: 'accept_remote' | 'keep_local' | 'merge') => {
      service.resolveConflict(taskId, resolution);
      setConflicts(prev => prev.filter(c => c.taskId !== taskId));
    }
  };
};
