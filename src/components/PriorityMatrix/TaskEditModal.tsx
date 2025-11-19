import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  DocumentTextIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { format, parseISO } from 'date-fns';
import { useMatrixStore } from '../../stores/useMatrixStore';

interface TimeBlock {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  timeBlock?: TimeBlock;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  timeBlock
}) => {
  const toast = useToast();
  const { createTimeBlock, deleteTimeBlock, deleteTask } = useMatrixStore();
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    status: task.status,
    category: task.category,
    estimated_duration: task.estimated_duration || 30,
    due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    tags: task.tags?.join(', ') || '',
    // Scheduled time fields (no date, uses due_date)
    scheduled_start_time: timeBlock ? format(parseISO(timeBlock.startTime), 'HH:mm') : '',
    scheduled_end_time: timeBlock ? format(parseISO(timeBlock.endTime), 'HH:mm') : ''
  });

  // Update form when task or timeBlock changes
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      category: task.category,
      estimated_duration: task.estimated_duration || 30,
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      tags: task.tags?.join(', ') || '',
      scheduled_start_time: timeBlock ? format(parseISO(timeBlock.startTime), 'HH:mm') : '',
      scheduled_end_time: timeBlock ? format(parseISO(timeBlock.endTime), 'HH:mm') : ''
    });
  }, [task, timeBlock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    // Validate scheduled time if provided
    if (formData.scheduled_start_time && formData.scheduled_end_time) {
      if (formData.scheduled_end_time <= formData.scheduled_start_time) {
        toast.error('End time must be after start time');
        return;
      }
      if (!formData.due_date) {
        toast.error('Please set a Due Date to schedule a specific time');
        return;
      }
    }

    setSaving(true);
    try {
      // Update task details
      await onSave(task.id, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        status: formData.status,
        category: formData.category,
        estimated_duration: formData.estimated_duration,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      });

      // Handle time block updates
      if (formData.due_date && formData.scheduled_start_time && formData.scheduled_end_time) {
        const startDateTime = new Date(`${formData.due_date}T${formData.scheduled_start_time}`);
        const endDateTime = new Date(`${formData.due_date}T${formData.scheduled_end_time}`);

        if (timeBlock) {
          // Update existing time block - delete and recreate
          await deleteTimeBlock(timeBlock.id);
          await createTimeBlock(task.id, startDateTime.toISOString(), endDateTime.toISOString());
        } else {
          // Create new time block
          await createTimeBlock(task.id, startDateTime.toISOString(), endDateTime.toISOString());
        }
      } else if (timeBlock && (!formData.scheduled_start_time || !formData.scheduled_end_time)) {
        // Remove time block if times were cleared
        await deleteTimeBlock(timeBlock.id);
      }
      
      toast.success('Task updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      toast.success('Task deleted');
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Unable to delete this task right now.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-2xl"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white" id="modal-title">
                Edit Task
              </h3>
              <button
                onClick={onClose}
                className="rounded-md text-white hover:bg-blue-500 p-1 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter task title"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="flex items-center text-sm font-medium text-gray-700 mb-1 gap-1">
                <DocumentTextIcon className="w-4 h-4" />
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add task description (optional)"
                rows={3}
              />
            </div>

            {/* Two-column layout for Priority and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Two-column layout for Category and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label htmlFor="category" className="flex items-center text-sm font-medium text-gray-700 mb-1 gap-1">
                  <TagIcon className="w-4 h-4" />
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category || 'work'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="health">Health</option>
                  <option value="learning">Learning</option>
                  <option value="creative">Creative</option>
                  <option value="social">Social</option>
                </select>
              </div>

              {/* Estimated Duration */}
              <div>
                <label htmlFor="duration" className="flex items-center text-sm font-medium text-gray-700 mb-1 gap-1">
                  <ClockIcon className="w-4 h-4" />
                  Estimated Duration (minutes)
                </label>
                <input
                  id="duration"
                  type="number"
                  min="5"
                  step="5"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Due Date - Calendar Widget */}
            <div>
              <label htmlFor="due_date" className="flex items-center text-sm font-medium text-gray-700 mb-1 gap-1">
                <CalendarIcon className="w-4 h-4" />
                Due Date
              </label>
              <input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                min={new Date().toISOString().split('T')[0]}
              />
              {formData.due_date && (
                <p className="mt-1 text-sm text-gray-600">
                  Due: {new Date(formData.due_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>

            {/* Scheduled Time Block - EDITABLE */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-medium text-gray-900">Scheduled Time (Optional)</h4>
                <span className="text-xs text-gray-500">Set specific time for this task</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Start Time */}
                <div>
                  <label htmlFor="scheduled_start_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    id="scheduled_start_time"
                    type="time"
                    step="300"
                    value={formData.scheduled_start_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label htmlFor="scheduled_end_time" className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    id="scheduled_end_time"
                    type="time"
                    step="300"
                    value={formData.scheduled_end_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Note about using due date */}
              {!formData.due_date && (formData.scheduled_start_time || formData.scheduled_end_time) && (
                <p className="mt-2 text-xs text-amber-600">
                  ⚠️ Please set a Due Date above to specify when this time block occurs
                </p>
              )}

              {/* Preview */}
              {formData.due_date && formData.scheduled_start_time && formData.scheduled_end_time && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  <strong>Scheduled:</strong> {new Date(formData.due_date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })} at {formData.scheduled_start_time} - {formData.scheduled_end_time}
                </div>
              )}

              {/* Clear schedule button */}
              {(formData.scheduled_start_time || formData.scheduled_end_time) && (
                <button
                  type="button"
                  onClick={() => setFormData({ 
                    ...formData, 
                    scheduled_start_time: '', 
                    scheduled_end_time: '' 
                  })}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Clear scheduled time
                </button>
              )}
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                id="tags"
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="urgent, meeting, research"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete Task
                  </>
                )}
              </button>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
