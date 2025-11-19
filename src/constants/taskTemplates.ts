import { TaskPriority } from '../types';

export type TaskTemplateCategory = 'work' | 'personal' | 'health' | 'learning' | 'custom';

export interface TaskTemplateDefinition {
  name: string;
  description: string;
  category: TaskTemplateCategory;
  defaultPriority: TaskPriority;
  estimatedDuration: number;
  tags: string[];
  neurotypeOptimized?: string[];
}

export interface TaskTemplate extends TaskTemplateDefinition {
  id: string;
}

export const DEFAULT_TASK_TEMPLATES: TaskTemplateDefinition[] = [
  {
    name: 'Email Processing',
    description: 'Process and respond to emails in batches',
    category: 'work',
    defaultPriority: 'medium',
    estimatedDuration: 30,
    tags: ['communication', 'routine'],
    neurotypeOptimized: ['adhd', 'autism']
  },
  {
    name: 'Deep Work Session',
    description: 'Focused work time for complex tasks',
    category: 'work',
    defaultPriority: 'high',
    estimatedDuration: 90,
    tags: ['focus', 'productivity'],
    neurotypeOptimized: ['adhd']
  },
  {
    name: 'Weekly Review',
    description: 'Review progress and plan upcoming week',
    category: 'personal',
    defaultPriority: 'medium',
    estimatedDuration: 45,
    tags: ['planning', 'reflection'],
    neurotypeOptimized: ['autism']
  },
  {
    name: 'Learning Session',
    description: 'Dedicated time for skill development',
    category: 'learning',
    defaultPriority: 'medium',
    estimatedDuration: 60,
    tags: ['education', 'growth'],
    neurotypeOptimized: ['dyslexia']
  },
  {
    name: 'Exercise Break',
    description: 'Physical activity and movement',
    category: 'health',
    defaultPriority: 'medium',
    estimatedDuration: 30,
    tags: ['health', 'break'],
    neurotypeOptimized: ['adhd', 'autism']
  },
  {
    name: 'Project Planning',
    description: 'Break down project into actionable tasks',
    category: 'work',
    defaultPriority: 'high',
    estimatedDuration: 60,
    tags: ['planning', 'organization'],
    neurotypeOptimized: ['autism', 'dyslexia']
  }
];

export const buildDefaultTemplates = (): TaskTemplate[] =>
  DEFAULT_TASK_TEMPLATES.map((template, index) => ({
    ...template,
    id: `default-${index}`
  }));
