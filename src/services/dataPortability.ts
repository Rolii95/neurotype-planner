import { Task } from '../types';
import { supabase } from './supabase';

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeTasks?: boolean;
  includeRoutines?: boolean;
  includeMoodLogs?: boolean;
  includeSettings?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    tasks: number;
    routines: number;
    moodLogs: number;
  };
  errors: string[];
}

class DataPortabilityService {
  private static instance: DataPortabilityService;

  private constructor() {}

  static getInstance(): DataPortabilityService {
    if (!DataPortabilityService.instance) {
      DataPortabilityService.instance = new DataPortabilityService();
    }
    return DataPortabilityService.instance;
  }

  // Export data to JSON
  async exportToJSON(options: ExportOptions): Promise<Blob> {
    const data = await this.gatherExportData(options);
    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  // Export data to CSV
  async exportToCSV(options: ExportOptions): Promise<Blob> {
    const data = await this.gatherExportData(options);
    let csvContent = '';

    // Export tasks as CSV
    if (data.tasks && data.tasks.length > 0) {
      csvContent += 'Tasks\n';
      csvContent += this.convertTasksToCSV(data.tasks);
      csvContent += '\n\n';
    }

    // Export routines as CSV
    if (data.routines && data.routines.length > 0) {
      csvContent += 'Routines\n';
      csvContent += this.convertRoutinesToCSV(data.routines);
      csvContent += '\n\n';
    }

    // Export mood logs as CSV
    if (data.moodLogs && data.moodLogs.length > 0) {
      csvContent += 'Mood Logs\n';
      csvContent += this.convertMoodLogsToCSV(data.moodLogs);
    }

    return new Blob([csvContent], { type: 'text/csv' });
  }

  // Export data to Markdown
  async exportToMarkdown(options: ExportOptions): Promise<Blob> {
    const data = await this.gatherExportData(options);
    let markdown = '# Neurotype Planner Data Export\n\n';
    markdown += `**Exported on:** ${new Date().toLocaleString()}\n\n`;

    // Export tasks
    if (data.tasks && data.tasks.length > 0) {
      markdown += '## Tasks\n\n';
      data.tasks.forEach((task: any) => {
        markdown += `### ${task.title}\n`;
        markdown += `- **Status:** ${task.status}\n`;
        markdown += `- **Priority:** ${task.priority}\n`;
        markdown += `- **Category:** ${task.category}\n`;
        if (task.description) markdown += `- **Description:** ${task.description}\n`;
        if (task.due_date) markdown += `- **Due:** ${new Date(task.due_date).toLocaleDateString()}\n`;
        markdown += '\n';
      });
    }

    // Export routines
    if (data.routines && data.routines.length > 0) {
      markdown += '## Routines\n\n';
      data.routines.forEach((routine: any) => {
        markdown += `### ${routine.name}\n`;
        markdown += `- **Type:** ${routine.type}\n`;
        if (routine.description) markdown += `- **Description:** ${routine.description}\n`;
        markdown += `- **Active:** ${routine.is_active ? 'Yes' : 'No'}\n`;
        markdown += '\n';
      });
    }

    // Export mood logs
    if (data.moodLogs && data.moodLogs.length > 0) {
      markdown += '## Mood Logs\n\n';
      markdown += '| Date | Mood | Energy | Focus | Notes |\n';
      markdown += '|------|------|--------|-------|-------|\n';
      data.moodLogs.forEach((log: any) => {
        markdown += `| ${new Date(log.timestamp).toLocaleDateString()} | ${log.mood}/10 | ${log.energy}/10 | ${log.focus}/10 | ${log.notes || '-'} |\n`;
      });
    }

    return new Blob([markdown], { type: 'text/markdown' });
  }

  // Download exported data
  downloadExport(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Import data from JSON
  async importFromJSON(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { tasks: 0, routines: 0, moodLogs: 0 },
      errors: [],
    };

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        result.errors.push('No authenticated user');
        return result;
      }

      // Import tasks
      if (data.tasks && Array.isArray(data.tasks)) {
        for (const task of data.tasks) {
          try {
            const { error } = await supabase.from('tasks').insert({
              ...task,
              id: undefined, // Let database generate new ID
              user_id: user.id,
            });
            if (!error) result.imported.tasks++;
            else result.errors.push(`Task import error: ${error.message}`);
          } catch (err) {
            result.errors.push(`Task import error: ${err}`);
          }
        }
      }

      // Import routines
      if (data.routines && Array.isArray(data.routines)) {
        for (const routine of data.routines) {
          try {
            const { error } = await supabase.from('routines').insert({
              ...routine,
              id: undefined,
              user_id: user.id,
            });
            if (!error) result.imported.routines++;
            else result.errors.push(`Routine import error: ${error.message}`);
          } catch (err) {
            result.errors.push(`Routine import error: ${err}`);
          }
        }
      }

      // Import mood logs
      if (data.moodLogs && Array.isArray(data.moodLogs)) {
        for (const log of data.moodLogs) {
          try {
            const { error } = await supabase.from('mood_entries').insert({
              ...log,
              id: undefined,
              user_id: user.id,
            });
            if (!error) result.imported.moodLogs++;
            else result.errors.push(`Mood log import error: ${error.message}`);
          } catch (err) {
            result.errors.push(`Mood log import error: ${err}`);
          }
        }
      }

      result.success = result.errors.length === 0;
    } catch (err) {
      result.errors.push(`JSON parse error: ${err}`);
    }

    return result;
  }

  // Import from CSV
  async importFromCSV(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { tasks: 0, routines: 0, moodLogs: 0 },
      errors: ['CSV import not yet implemented'],
    };
    return result;
  }

  // Gather data for export
  private async gatherExportData(options: ExportOptions): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const exportData: any = {
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    // Fetch tasks
    if (options.includeTasks) {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start.toISOString())
          .lte('created_at', options.dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (!error) exportData.tasks = data;
    }

    // Fetch routines
    if (options.includeRoutines) {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id);
      if (!error) exportData.routines = data;
    }

    // Fetch mood logs
    if (options.includeMoodLogs) {
      let query = supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id);

      if (options.dateRange) {
        query = query
          .gte('timestamp', options.dateRange.start.toISOString())
          .lte('timestamp', options.dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (!error) exportData.moodLogs = data;
    }

    // Include settings
    if (options.includeSettings) {
      const settings = {
        accessibility: localStorage.getItem('accessibility-settings'),
        notifications: localStorage.getItem('notification-settings'),
        theme: localStorage.getItem('theme'),
      };
      exportData.settings = settings;
    }

    return exportData;
  }

  // Convert tasks to CSV format
  private convertTasksToCSV(tasks: any[]): string {
    const headers = ['Title', 'Status', 'Priority', 'Category', 'Description', 'Due Date', 'Created'];
    let csv = headers.join(',') + '\n';

    tasks.forEach(task => {
      const row = [
        this.escapeCSV(task.title),
        this.escapeCSV(task.status),
        this.escapeCSV(task.priority),
        this.escapeCSV(task.category),
        this.escapeCSV(task.description || ''),
        this.escapeCSV(task.due_date ? new Date(task.due_date).toLocaleDateString() : ''),
        this.escapeCSV(new Date(task.created_at).toLocaleDateString()),
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  // Convert routines to CSV format
  private convertRoutinesToCSV(routines: any[]): string {
    const headers = ['Name', 'Type', 'Description', 'Active', 'Flexibility', 'Created'];
    let csv = headers.join(',') + '\n';

    routines.forEach(routine => {
      const row = [
        this.escapeCSV(routine.name),
        this.escapeCSV(routine.type),
        this.escapeCSV(routine.description || ''),
        routine.is_active ? 'Yes' : 'No',
        this.escapeCSV(routine.flexibility),
        this.escapeCSV(new Date(routine.created_at).toLocaleDateString()),
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  // Convert mood logs to CSV format
  private convertMoodLogsToCSV(logs: any[]): string {
    const headers = ['Date', 'Mood', 'Energy', 'Focus', 'Anxiety', 'Stress', 'Motivation', 'Notes'];
    let csv = headers.join(',') + '\n';

    logs.forEach(log => {
      const row = [
        this.escapeCSV(new Date(log.timestamp).toLocaleString()),
        log.mood.toString(),
        log.energy.toString(),
        log.focus.toString(),
        log.anxiety.toString(),
        log.stress.toString(),
        log.motivation.toString(),
        this.escapeCSV(log.notes || ''),
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  // Escape CSV values
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // Create backup
  async createBackup(): Promise<Blob> {
    return this.exportToJSON({
      format: 'json',
      includeTasks: true,
      includeRoutines: true,
      includeMoodLogs: true,
      includeSettings: true,
    });
  }

  // Restore from backup
  async restoreFromBackup(file: File): Promise<ImportResult> {
    return this.importFromJSON(file);
  }
}

export const dataPortabilityService = DataPortabilityService.getInstance();
export default dataPortabilityService;
