import { supabase, getCurrentUserId } from './supabase';
import { TaskAttachment } from '../features/collaboration/types';

const ATTACHMENT_BUCKET = 'task-attachments';

export interface UploadAttachmentOptions {
  visibility?: 'public' | 'private';
  description?: string;
  source?: 'manual-upload' | 'email-import';
}

export class TaskAttachmentService {
  static async uploadAttachment(
    taskId: string,
    file: File | Blob,
    fileName: string,
    options: UploadAttachmentOptions = {}
  ): Promise<TaskAttachment | null> {
    if (!supabase) {
      console.warn('Supabase client unavailable. Attachments are disabled in demo mode.');
      return null;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to upload attachments.');
    }

    const extension = fileName.split('.').pop();
    const storagePath = `${userId}/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}${extension ? `.${extension}` : ''}`;

    const uploadResponse = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(storagePath, file, {
        upsert: true,
        contentType: file instanceof File ? file.type : undefined,
      });

    if (uploadResponse.error) {
      throw uploadResponse.error;
    }

    const { data: publicUrlData } = supabase.storage
      .from(ATTACHMENT_BUCKET)
      .getPublicUrl(storagePath);

    const { data, error } = await supabase
      .from('task_attachments')
      .insert([
        {
          task_id: taskId,
          file_name: fileName,
          file_type: file instanceof File ? file.type : 'application/octet-stream',
          file_size: file instanceof File ? file.size : (file as Blob).size,
          uploaded_by: userId,
          is_private: options.visibility === 'private',
          storage_path: storagePath,
          source: options.source || 'manual-upload',
          description: options.description,
        },
      ])
      .select(
        'id, task_id, file_name, file_type, file_size, uploaded_by, uploaded_at, is_private, storage_path'
      )
      .single();

    if (error) {
      throw error;
    }

    const attachment: TaskAttachment = {
      id: data.id,
      taskId: data.task_id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      uploadedBy: data.uploaded_by,
      uploadedAt: new Date(data.uploaded_at),
      isPrivate: data.is_private,
      downloadUrl: publicUrlData.publicUrl,
    };

    return attachment;
  }
}
