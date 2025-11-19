export type TaskProviderId = 'google-tasks' | 'microsoft-todo' | 'asana' | 'trello' | 'todoist';

export interface TaskProviderDescriptor {
  id: TaskProviderId;
  name: string;
  description: string;
  supportsWebhooks: boolean;
  supportsFileImport: boolean;
  authType: 'oauth' | 'api-key';
  icon?: string;
  documentationUrl?: string;
}

export interface TaskIntegrationConnection {
  providerId: TaskProviderId;
  connected: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  lastSyncedAt?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ExternalTaskPayload {
  id: string;
  providerId: TaskProviderId;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status?: 'needs-action' | 'completed' | 'cancelled' | 'in-progress';
  labels?: string[];
  sourceData?: Record<string, unknown>;
}

export interface FileImportResult {
  tasks: ExternalTaskPayload[];
  warnings: string[];
}
