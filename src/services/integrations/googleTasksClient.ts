import { Task } from '../../types';
import { ExternalTaskPayload } from '../../types/integrations';

interface GoogleTasksAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface GoogleTasksListResponse {
  items?: Array<{
    id: string;
    title: string;
    notes?: string;
    due?: string;
    status?: string;
    updated?: string;
  }>;
}

const GOOGLE_TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';
const GOOGLE_TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/tasks.readonly';

export interface GoogleTasksConfig {
  clientId: string;
  redirectUri: string;
}

export class GoogleTasksClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;

  constructor(private readonly config: GoogleTasksConfig) {}

  /**
   * Build the Google OAuth URL for the popup / redirect flow.
   */
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      scope: GOOGLE_TASKS_SCOPE,
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Store tokens returned from a backend exchange.
   */
  setAuthTokens(auth: GoogleTasksAuthResponse) {
    this.accessToken = auth.accessToken;
    this.refreshToken = auth.refreshToken || null;
    this.expiresAt = auth.expiresAt ? Date.parse(auth.expiresAt) : null;
  }

  /**
   * Whether the current access token is expired.
   */
  isTokenExpired(): boolean {
    if (!this.expiresAt) return false;
    return Date.now() >= this.expiresAt - 30_000; // include small buffer
  }

  /**
   * Fetch the user's task lists.
   * The actual token refresh flow must happen in a secure backend.
   */
  async listTasks(taskListId: string = '@default'): Promise<ExternalTaskPayload[]> {
    if (!this.accessToken) {
      throw new Error('Google Tasks access token missing. Call setAuthTokens first.');
    }

    const response = await fetch(`${GOOGLE_TASKS_API_BASE}/lists/${taskListId}/tasks`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to fetch Google Tasks: ${message}`);
    }

    const payload = (await response.json()) as GoogleTasksListResponse;

    return (payload.items || []).map((item) => {
      const status = item.status === 'completed' ? 'completed' : 'needs-action';

      return {
        id: item.id,
        providerId: 'google-tasks' as const,
        title: item.title,
        description: item.notes,
        dueDate: item.due || undefined,
        status,
        labels: [] as string[],
        sourceData: item,
      };
    });
  }

  /**
   * Create a new Google Task from a local task payload.
   */
  async createTask(taskListId: string, task: Task): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Google Tasks access token missing. Call setAuthTokens first.');
    }

    const response = await fetch(`${GOOGLE_TASKS_API_BASE}/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: task.title,
        notes: task.description,
        due: task.due_date,
        status: task.status === 'completed' ? 'completed' : 'needsAction',
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create Google Task: ${message}`);
    }

    const payload = await response.json();
    return payload.id as string;
  }
}
