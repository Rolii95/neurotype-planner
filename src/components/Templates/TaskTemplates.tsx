import { useState } from 'react';
import { PlusIcon, TrashIcon, DocumentDuplicateIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useMatrixStore } from '../../stores/useMatrixStore';
import { TaskPriority } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useAvailableTemplates } from '../../hooks/useAvailableTemplates';
import { TaskTemplate } from '../../constants/taskTemplates';

interface TaskTemplatesProps {
  onApplyTemplate?: (templateId: string) => void;
}

export const TaskTemplates: React.FC<TaskTemplatesProps> = ({ onApplyTemplate }) => {
  const { 
    templates, 
    createTemplate, 
    deleteTemplate, 
    applyTemplate,
    isLoading
  } = useMatrixStore();
  const availableTemplates = useAvailableTemplates();
  
  const toast = useToast();
  const confirm = useConfirm();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [deletedTemplates, setDeletedTemplates] = useState<Map<string, {template: TaskTemplate, timeoutId: NodeJS.Timeout}>>(new Map());

  // Filter templates
  const filteredTemplates = availableTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleApplyTemplate = async (template: TaskTemplate) => {
    setIsApplying(template.id);
    try {
      const createdTask = await applyTemplate(template.id);
      onApplyTemplate?.(template.id);

      const taskTitle = createdTask?.title || template.name;
      toast.success(`"${taskTitle}" task created! Check your Tasks tab.`);
    } catch (error) {
      console.error('Failed to apply template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task from template.';
      toast.error(errorMessage);
    } finally {
      setIsApplying(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (templateId.startsWith('default-')) {
      toast.warning('Cannot delete default templates');
      return;
    }
    
    // Find the template data before deletion
    const templateToDelete = templates.find(t => t.id === templateId);
    if (!templateToDelete) return;
    
    const confirmed = await confirm.confirm({
      title: 'Delete Template',
      message: `Are you sure you want to delete "${templateToDelete.name}"? You can undo this action within 5 seconds.`,
      type: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });

    if (confirmed) {
      try {
        // Delete the template
        await deleteTemplate(templateId);
        
        // Set up undo functionality with timeout
        const timeoutId = setTimeout(() => {
          // Permanently clean up after 5 seconds
          setDeletedTemplates(prev => {
            const newMap = new Map(prev);
            newMap.delete(templateId);
            return newMap;
          });
        }, 5000);

        // Store the deleted template for potential undo
        setDeletedTemplates(prev => {
          const newMap = new Map(prev);
          newMap.set(templateId, { template: templateToDelete, timeoutId });
          return newMap;
        });

        // Show success toast with undo action
        toast.showToast(
          `Template "${templateToDelete.name}" deleted`,
          'success',
          5000,
          {
            label: 'Undo',
            onClick: async () => {
              const deletedData = deletedTemplates.get(templateId);
              if (deletedData) {
                // Clear the timeout
                clearTimeout(deletedData.timeoutId);
                
                // Restore the template
                try {
                  await createTemplate({
                    name: deletedData.template.name,
                    description: deletedData.template.description,
                    category: deletedData.template.category,
                    defaultPriority: deletedData.template.defaultPriority,
                    estimatedDuration: deletedData.template.estimatedDuration,
                    tags: deletedData.template.tags,
                    neurotypeOptimized: deletedData.template.neurotypeOptimized
                  });
                  
                  // Remove from deleted map
                  setDeletedTemplates(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(templateId);
                    return newMap;
                  });
                  
                  toast.success(`Template "${templateToDelete.name}" restored`);
                } catch (error) {
                  console.error('Failed to restore template:', error);
                  toast.error('Failed to restore template');
                }
              }
            }
          }
        );
      } catch (error) {
        console.error('Failed to delete template:', error);
        toast.error('Failed to delete template. Please try again.');
      }
    }
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    const iconClass = "h-4 w-4";
    switch (category) {
      case 'work':
        return <div className={`${iconClass} bg-blue-500 rounded`} />;
      case 'personal':
        return <div className={`${iconClass} bg-green-500 rounded`} />;
      case 'health':
        return <div className={`${iconClass} bg-red-500 rounded`} />;
      case 'learning':
        return <div className={`${iconClass} bg-purple-500 rounded`} />;
      default:
        return <div className={`${iconClass} bg-gray-500 rounded`} />;
    }
  };

  const NeuroTypeTag = ({ neurotype }: { neurotype: string }) => {
    const colors = {
      adhd: 'bg-orange-100 text-orange-800',
      autism: 'bg-blue-100 text-blue-800',
      dyslexia: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        colors[neurotype as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {neurotype.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Task Templates</h3>
            <p className="text-sm text-gray-500">
              Quick-start templates optimized for different neurotypes
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Template
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
            className="block border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">All Categories</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="learning">Learning</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-6">
        {isLoading && availableTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" aria-hidden="true" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">Loading templates…</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please wait while we fetch the latest template library.
            </p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or create a new template.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Template Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon category={template.category} />
                    <h4 className="font-medium text-gray-900 truncate">
                      {template.name}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Apply template"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    {!template.id.startsWith('default-') && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Delete template"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Template Description */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Template Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Duration: {template.estimatedDuration}min</span>
                    <span className={`px-2 py-1 rounded-full ${
                      template.defaultPriority === 'urgent' ? 'bg-red-100 text-red-800' :
                      template.defaultPriority === 'high' ? 'bg-orange-100 text-orange-800' :
                      template.defaultPriority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {template.defaultPriority}
                    </span>
                  </div>

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{template.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Neurotype Optimizations */}
                  {template.neurotypeOptimized && template.neurotypeOptimized.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500 mr-1">Optimized for:</span>
                      {template.neurotypeOptimized.map((neurotype: string, index: number) => (
                        <NeuroTypeTag key={index} neurotype={neurotype} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <button
                  onClick={() => handleApplyTemplate(template)}
                  disabled={isApplying === template.id}
                  className="w-full mt-4 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying === template.id ? 'Creating...' : 'Use Template'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{filteredTemplates.length} templates available</span>
          <span>{templates.length} custom templates</span>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-medium text-gray-900">Create New Template</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const template = {
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  category: formData.get('category') as 'work' | 'personal' | 'health' | 'learning' | 'custom',
                  defaultPriority: formData.get('priority') as TaskPriority,
                  estimatedDuration: parseInt(formData.get('duration') as string),
                  tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
                  neurotypeOptimized: Array.from(formData.getAll('neurotype')) as string[]
                };

                try {
                  await createTemplate(template);
                  setShowCreateModal(false);
                  e.currentTarget.reset();
                  toast.success('Template created successfully!');
                } catch (error) {
                  console.error('Failed to create template:', error);
                  toast.error('Failed to create template. Please try again.');
                }
              }}
              className="px-6 py-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Morning Routine"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="What does this template help with?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    required
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Priority *
                  </label>
                  <select
                    name="priority"
                    required
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="duration"
                  required
                  min="5"
                  step="5"
                  defaultValue="30"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., focus, routine, planning"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optimized for Neurotypes
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="neurotype"
                      value="adhd"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">ADHD</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="neurotype"
                      value="autism"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Autism</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="neurotype"
                      value="dyslexia"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Dyslexia</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
