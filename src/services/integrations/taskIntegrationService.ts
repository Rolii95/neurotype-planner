import { supabaseService } from '../supabase';
import { Task } from '../../types';
import {
  ExternalTaskPayload,
  FileImportResult,
  TaskIntegrationConnection,
  TaskProviderDescriptor,
  TaskProviderId,
} from '../../types/integrations';

export const SUPPORTED_PROVIDERS: TaskProviderDescriptor[] = [
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    description: 'Sync personal tasks across Gmail, Google Calendar, and Google Tasks.',
    supportsWebhooks: true,
    supportsFileImport: true,
    authType: 'oauth',
    documentationUrl: 'https://developers.google.com/tasks',
  },
  {
    id: 'microsoft-todo',
    name: 'Microsoft To Do',
    description: 'Connect task lists managed through the Microsoft 365 ecosystem.',
    supportsWebhooks: true,
    supportsFileImport: true,
    authType: 'oauth',
    documentationUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/todo-overview',
  },
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Two-way sync with Todoist projects and sections.',
    supportsWebhooks: true,
    supportsFileImport: false,
    authType: 'oauth',
    documentationUrl: 'https://developer.todoist.com/rest/v2/',
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Bring in work tasks from Asana projects and keep status aligned.',
    supportsWebhooks: true,
    supportsFileImport: false,
    authType: 'oauth',
    documentationUrl: 'https://developers.asana.com/docs/',
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Import cards from Trello boards and map them to the Priority Matrix.',
    supportsWebhooks: true,
    supportsFileImport: true,
    authType: 'api-key',
    documentationUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
  },
];

export interface RegisterWebhookPayload {
  providerId: TaskProviderId;
  callbackUrl: string;
}

export interface ConnectProviderRequest {
  providerId: TaskProviderId;
  authorizationCode?: string;
  redirectUri?: string;
  apiKey?: string;
}

export interface FileImportOptions {
  providerHint?: TaskProviderId;
  defaultQuadrant?: Task['quadrant'];
}

/**
 * TaskIntegrationService centralizes the round-trip between the client app and the
 * Supabase edge function (or backend) that actually stores secrets and talks to the provider APIs.
 */
export const TaskIntegrationService = {
  async listConnections(): Promise<TaskIntegrationConnection[]> {
    const response = await supabaseService.invokeFunction<TaskIntegrationConnection[]>(
      'task-integrations-list',
      {}
    );

    return response || [];
  },

  async connectProvider(request: ConnectProviderRequest): Promise<TaskIntegrationConnection> {
    const payload: Record<string, unknown> = {
      providerId: request.providerId,
    };

    if (request.authorizationCode) {
      payload.authorizationCode = request.authorizationCode;
    }
    if (request.redirectUri) {
      payload.redirectUri = request.redirectUri;
    }
    if (request.apiKey) {
      payload.apiKey = request.apiKey;
    }

    const response = await supabaseService.invokeFunction<TaskIntegrationConnection>(
      'task-integrations-connect',
      payload
    );

    if (!response) {
      throw new Error('Failed to connect provider. No response received.');
    }

    return response;
  },

  async disconnectProvider(providerId: TaskProviderId): Promise<void> {
    await supabaseService.invokeFunction('task-integrations-disconnect', { providerId });
  },

  async registerWebhook(payload: RegisterWebhookPayload): Promise<TaskIntegrationConnection> {
    const request: Record<string, unknown> = {
      providerId: payload.providerId,
      callbackUrl: payload.callbackUrl,
    };

    const response = await supabaseService.invokeFunction<TaskIntegrationConnection>(
      'task-integrations-register-webhook',
      request
    );

    if (!response) {
      throw new Error('Failed to register webhook.');
    }

    return response;
  },

  async syncFromProvider(providerId: TaskProviderId): Promise<ExternalTaskPayload[]> {
    const response = await supabaseService.invokeFunction<ExternalTaskPayload[]>(
      'task-integrations-sync',
      { providerId }
    );

    return response || [];
  },

  async importFromFile(file: File | Blob, options: FileImportOptions = {}): Promise<FileImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    const response = await supabaseService.invokeFunction<FileImportResult>(
      'task-integrations-import-file',
      {
        fileName: 'upload',
        fileType: file.type,
        base64,
        options,
      }
    );

    if (!response) {
      throw new Error('Failed to process the imported file.');
    }

    return response;
  },
};
