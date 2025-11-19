import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { 
  XMarkIcon,
  CheckIcon,
  CalendarIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { useAvailableTemplates } from '../../hooks/useAvailableTemplates';
import { useMatrixStore } from '../../stores/useMatrixStore';

interface QuickAddTaskProps {
  onSubmit: (task: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  quadrantId: string;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  onSubmit,
  onCancel,
  placeholder = 'Add a new task...',
  quadrantId
}) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { applyTemplate } = useMatrixStore();
  const templates = useAvailableTemplates();
  
  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        status: 'not-started',
        priority: getDefaultPriority(quadrantId),
        quadrant: quadrantId as any,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        // Required database fields
        buffer_time: 0,
        energy_required: 'medium' as const,
        focus_required: 'medium' as const,
        sensory_considerations: [],
      });
      // Reset form
      setTitle('');
      setDueDate('');
      setShowDatePicker(false);
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Failed to create task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTemplateApply = async (templateId: string) => {
    if (!templateId) {
      return;
    }

    setIsApplyingTemplate(true);
    try {
      const selectedTemplate = templates.find(template => template.id === templateId);
      if (!selectedTemplate) {
        toast.error('Template not found. Please try again.');
        return;
      }
      const customDueDate = dueDate ? new Date(dueDate).toISOString() : undefined;

      const createdTask = await applyTemplate(templateId, {
        quadrant: quadrantId as any,
        due_date: customDueDate,
      });

      if (createdTask) {
        toast.success(`Template "${selectedTemplate.name}" added to this quadrant.`);
        onCancel();
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error('Could not create a task from template. Please try again.');
    } finally {
      setIsApplyingTemplate(false);
      setShowTemplatePicker(false);
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };
  
  // Get default priority based on quadrant
  const getDefaultPriority = (quadrant: string): Task['priority'] => {
    switch (quadrant) {
      case 'urgent-important': return 'urgent';
      case 'urgent-not-important': return 'high';
      case 'not-urgent-important': return 'medium';
      case 'not-urgent-not-important': return 'low';
      default: return 'medium';
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="quick-add-task mb-3">
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg focus-within:border-blue-500 transition-all">
        {/* Title Input Row */}
        <div className="flex items-center gap-2 p-3 focus-within:bg-blue-50">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
            disabled={isSubmitting || isApplyingTemplate}
            aria-label="New task title"
          />
          
          <div className="flex items-center gap-1">
            {/* Calendar Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`p-1.5 rounded transition-colors ${
                showDatePicker || dueDate
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              aria-label={showDatePicker ? 'Hide date picker' : 'Show date picker'}
              title="Schedule task"
              disabled={isSubmitting || isApplyingTemplate}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            
            {/* Template Picker Toggle */}
            <button
              type="button"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className={`p-1.5 rounded transition-colors ${
                showTemplatePicker
                  ? 'bg-purple-100 text-purple-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              aria-label={showTemplatePicker ? 'Hide template picker' : 'Show task templates'}
              title="Apply task template"
              disabled={isSubmitting || isApplyingTemplate || templates.length === 0}
            >
              {isApplyingTemplate ? (
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <DocumentDuplicateIcon className="w-4 h-4" />
              )}
            </button>
            
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting || isApplyingTemplate}
              className="p-1.5 rounded text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Add task"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cancel"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Date Picker Row (Expandable) */}
        {showDatePicker && (
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                aria-label="Due date"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear
                </button>
              )}
            </div>
            {dueDate && (
              <p className="mt-2 text-xs text-gray-600 ml-6">
                📅 Scheduled: {new Date(dueDate).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            )}
          </div>
        )}

        {/* Template Picker Row */}
        {showTemplatePicker && (
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Apply a quick-start template
            </label>
            <select
              defaultValue=""
              onChange={(e) => {
                const templateId = e.target.value;
                if (!templateId) return;
                handleTemplateApply(templateId);
                // Reset selection after applying
                e.currentTarget.value = '';
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isApplyingTemplate}
              aria-label="Task template picker"
            >
              <option value="" disabled>
                Select a template to create a task...
              </option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} • {template.estimatedDuration} min
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">
                No templates available yet. Create one from the Task Templates section.
              </p>
            )}
          </div>
        )}
      </div>
    </form>
  );
};