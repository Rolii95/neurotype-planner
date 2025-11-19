import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { boardService, Board, BoardStep } from '../services/boardService';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

export default function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [board, setBoard] = useState<Board | null>(null);
  const [steps, setSteps] = useState<BoardStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [deletingStep, setDeletingStep] = useState<string | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletedSteps, setDeletedSteps] = useState<Map<string, {step: BoardStep, timeoutId: NodeJS.Timeout}>>(new Map());
  const [deletedBoards, setDeletedBoards] = useState<Map<string, {board: Board, timeoutId: NodeJS.Timeout}>>(new Map());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[],
  });
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStep, setNewStep] = useState({
    step_type: 'task' as const,
    title: '',
    description: '',
    duration: 10,
    color: '#3B82F6',
    icon: '✓',
  });
  const [draggedStep, setDraggedStep] = useState<string | null>(null);

  useEffect(() => {
    loadBoard();
  }, [boardId]);

  const loadBoard = async () => {
    if (!boardId) return;
    
    setLoading(true);
    const result = await boardService.getBoard(boardId);
    
    if (result) {
      setBoard(result.board);
      setSteps(result.steps);
      setFormData({
        title: result.board.title,
        description: result.board.description || '',
        tags: result.board.tags || [],
      });
    } else {
      toast.error('Board not found');
      navigate('/boards');
    }
    setLoading(false);
  };

  const handleSaveBoard = async () => {
    if (!boardId || !board) return;

    setSavingBoard(true);
    try {
      const updated = await boardService.updateBoard(boardId, formData);
      if (updated) {
        setBoard(updated);
        setEditMode(false);
        toast.success('Board updated successfully!');
      } else {
        toast.error('Failed to update board');
      }
    } catch (error) {
      console.error('Failed to save board:', error);
      toast.error('Failed to update board');
    } finally {
      setSavingBoard(false);
    }
  };

  const handleAddStep = async () => {
    if (!boardId || !newStep.title.trim()) return;

    setAddingStep(true);
    try {
      const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_index)) + 1 : 0;
      
      const stepData = {
        step_type: newStep.step_type,
        title: newStep.title,
        description: newStep.description || undefined,
        duration: newStep.duration,
        order_index: nextOrder,
        visual_cues: {
          color: newStep.color,
          icon: newStep.icon,
        },
        timer_settings: {
          autoStart: false,
          showWarningAt: 60,
          allowOverrun: true,
          endNotification: {
            type: 'audio' as const,
            intensity: 'normal' as const,
          },
        },
        neurotype_adaptations: {},
        is_flexible: false,
        is_optional: false,
        is_completed: false,
        execution_state: {
          status: 'pending' as const,
        },
      };

      const createdSteps = await boardService.addStepsToBoard(boardId, [stepData]);
      if (createdSteps.length > 0) {
        setSteps([...steps, createdSteps[0]]);
        setShowAddStep(false);
        setNewStep({
          step_type: 'task',
          title: '',
          description: '',
          duration: 10,
          color: '#3B82F6',
          icon: '✓',
        });
        toast.success('Step added successfully');
      } else {
        toast.error('Failed to add step');
      }
    } catch (error) {
      console.error('Failed to add step:', error);
      toast.error('Failed to add step');
    } finally {
      setAddingStep(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    // Find the step data before deletion
    const stepToDelete = steps.find(s => s.id === stepId);
    if (!stepToDelete) return;

    const confirmed = await confirm.confirm({
      title: 'Delete Step',
      message: `Are you sure you want to delete "${stepToDelete.title}"? You can undo this action within 5 seconds.`,
      type: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });

    if (!confirmed) return;

    setDeletingStep(stepId);
    try {
      const success = await boardService.deleteStep(stepId);
      if (success) {
        // Remove from UI immediately
        setSteps(steps.filter(s => s.id !== stepId));
        
        // Set up undo functionality with timeout
        const timeoutId = setTimeout(() => {
          // Permanently clean up after 5 seconds
          setDeletedSteps(prev => {
            const newMap = new Map(prev);
            newMap.delete(stepId);
            return newMap;
          });
        }, 5000);

        // Store the deleted step for potential undo
        setDeletedSteps(prev => {
          const newMap = new Map(prev);
          newMap.set(stepId, { step: stepToDelete, timeoutId });
          return newMap;
        });

        // Show success toast with undo action
        toast.showToast(
          `Step "${stepToDelete.title}" deleted`,
          'success',
          5000,
          {
            label: 'Undo',
            onClick: async () => {
              const deletedData = deletedSteps.get(stepId);
              if (deletedData && boardId) {
                // Clear the timeout
                clearTimeout(deletedData.timeoutId);
                
                // Restore the step
                try {
                  const stepData = {
                    step_type: deletedData.step.step_type,
                    title: deletedData.step.title,
                    description: deletedData.step.description,
                    duration: deletedData.step.duration,
                    order_index: deletedData.step.order_index,
                    visual_cues: deletedData.step.visual_cues,
                    timer_settings: deletedData.step.timer_settings,
                    neurotype_adaptations: deletedData.step.neurotype_adaptations,
                    is_flexible: deletedData.step.is_flexible,
                    is_optional: deletedData.step.is_optional,
                    is_completed: deletedData.step.is_completed,
                    execution_state: deletedData.step.execution_state,
                  };

                  const restoredSteps = await boardService.addStepsToBoard(boardId, [stepData]);
                  if (restoredSteps.length > 0) {
                    // Add back to steps list in correct position
                    setSteps(prev => {
                      const newSteps = [...prev, restoredSteps[0]];
                      // Sort by order_index to maintain correct order
                      return newSteps.sort((a, b) => a.order_index - b.order_index);
                    });
                    
                    // Remove from deleted map
                    setDeletedSteps(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(stepId);
                      return newMap;
                    });
                    
                    toast.success(`Step "${stepToDelete.title}" restored`);
                  } else {
                    toast.error('Failed to restore step');
                  }
                } catch (error) {
                  console.error('Failed to restore step:', error);
                  toast.error('Failed to restore step');
                }
              }
            }
          }
        );
      } else {
        toast.error('Failed to delete step');
      }
    } catch (error) {
      console.error('Failed to delete step:', error);
      toast.error('Failed to delete step');
    } finally {
      setDeletingStep(null);
    }
  };

  const handleDragStart = (stepId: string) => {
    setDraggedStep(stepId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStepId: string) => {
    if (!draggedStep || draggedStep === targetStepId || !boardId) return;

    const draggedIndex = steps.findIndex(s => s.id === draggedStep);
    const targetIndex = steps.findIndex(s => s.id === targetStepId);
    
    const newSteps = [...steps];
    const [removed] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(targetIndex, 0, removed);
    
    // Update order_index for all steps
    const stepIds = newSteps.map(step => step.id);

    const success = await boardService.reorderSteps(boardId, stepIds);
    if (success) {
      setSteps(newSteps);
    }
    
    setDraggedStep(null);
  };

  const handleGenerateShareCode = async () => {
    if (!boardId) return;
    
    setGeneratingShare(true);
    try {
      const shareCode = await boardService.generateShareCode(boardId);
      if (shareCode) {
        const shareUrl = `${window.location.origin}/boards/shared/${shareCode}`;
        navigator.clipboard.writeText(shareUrl);
        toast.showToast(
          'Share link copied to clipboard!',
          'success',
          7000,
          {
            label: 'View Link',
            onClick: () => window.open(shareUrl, '_blank')
          }
        );
      } else {
        toast.error('Failed to generate share link');
      }
    } catch (error) {
      console.error('Failed to generate share code:', error);
      toast.error('Failed to generate share link');
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!boardId || !board) return;
    
    const name = prompt('Template name:', board.title);
    if (!name) return;
    
    const category = prompt('Category (morning/evening/work/self-care/exercise/study/custom):', 'custom');
    if (!category) return;
    
    setSavingTemplate(true);
    try {
      const success = await boardService.saveAsTemplate(boardId, name, category);
      if (success) {
        toast.success('Board saved as template!');
        loadBoard();
      } else {
        toast.error('Failed to save as template');
      }
    } catch (error) {
      console.error('Failed to save as template:', error);
      toast.error('Failed to save as template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDuplicate = async () => {
    if (!boardId || !board) return;
    
    setDuplicating(true);
    try {
      const duplicate = await boardService.duplicateBoard(boardId, `${board.title} (Copy)`);
      if (duplicate) {
        navigate(`/boards/${duplicate.id}`);
        toast.success('Board duplicated successfully');
      } else {
        toast.error('Failed to duplicate board');
      }
    } catch (error) {
      console.error('Failed to duplicate board:', error);
      toast.error('Failed to duplicate board');
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!boardId || !board) return;

    const confirmed = await confirm.confirm({
      title: 'Delete Board',
      message: `Are you sure you want to delete "${board.title}"? This action cannot be undone.`,
      type: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });

    if (!confirmed) return;
    
    setDeleting(true);
    try {
      const success = await boardService.deleteBoard(boardId);
      if (success) {
        toast.success(`Board "${board.title}" deleted successfully`);
        navigate('/boards');
      } else {
        toast.error('Failed to delete board');
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
      toast.error('Failed to delete board');
    } finally {
      setDeleting(false);
    }
  };

  const handleStartExecution = () => {
    if (boardId) {
      navigate(`/boards/${boardId}/execute`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Board not found</p>
        <Link to="/boards" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Boards
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {editMode ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-2xl font-bold w-full border-b-2 border-blue-500 bg-transparent focus:outline-none text-gray-900 dark:text-white"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{board.title}</h1>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {board.board_type}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                {board.layout}
              </span>
              {board.is_template && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  Template
                </span>
              )}
              {board.is_public && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                  Public
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => editMode ? handleSaveBoard() : setEditMode(true)}
            disabled={savingBoard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingBoard ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              editMode ? 'Save' : 'Edit'
            )}
          </button>
        </div>

        {editMode ? (
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Board description..."
          />
        ) : (
          <p className="text-gray-600 dark:text-gray-400 mt-3">
            {board.description || 'No description'}
          </p>
        )}

        {board.tags && board.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {board.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Steps</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{steps.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Duration</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {steps.reduce((sum, s) => sum + (s.duration || 0), 0)} min
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Executions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{board.total_executions || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {board.completion_rate ? `${Math.round(board.completion_rate)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleStartExecution}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            ▶️ Start Execution
          </button>
          <button
            onClick={handleGenerateShareCode}
            disabled={generatingShare}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generatingShare ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>🔗 Share</>
            )}
          </button>
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingTemplate ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>💾 Save as Template</>
            )}
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {duplicating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Duplicating...
              </>
            ) : (
              <>📋 Duplicate</>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>🗑️ Delete</>
            )}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Steps</h2>
            <button
              onClick={() => setShowAddStep(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Step
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {steps.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              No steps yet. Add your first step to get started!
            </div>
          ) : (
            steps.map((step, idx) => (
              <div
                key={step.id}
                draggable
                onDragStart={() => handleDragStart(step.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(step.id)}
                className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:border-blue-500 transition-colors ${
                  draggedStep === step.id ? 'opacity-50' : ''
                }`}
                style={{ borderLeft: `4px solid ${step.visual_cues?.color || '#3B82F6'}` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{step.visual_cues?.icon || '•'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                        <h3 className="font-medium text-gray-900 dark:text-white">{step.title}</h3>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {step.step_type}
                        </span>
                      </div>
                      {step.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{step.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {step.duration && <span>⏱️ {step.duration} min</span>}
                        {step.is_flexible && <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">Flexible</span>}
                        {step.is_optional && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">Optional</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteStep(step.id)}
                    disabled={deletingStep === step.id}
                    className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete step"
                  >
                    {deletingStep === step.id ? (
                      <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                    ) : (
                      '🗑️'
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Step Modal */}
      {showAddStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Step</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Step Type
                </label>
                <select
                  value={newStep.step_type}
                  onChange={(e) => setNewStep({ ...newStep, step_type: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="task">Task</option>
                  <option value="flexZone">Flex Zone</option>
                  <option value="note">Note</option>
                  <option value="transition">Transition</option>
                  <option value="break">Break</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newStep.title}
                  onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Step title"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newStep.description}
                  onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newStep.duration}
                  onChange={(e) => setNewStep({ ...newStep, duration: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icon
                  </label>
                  <input
                    type="text"
                    value={newStep.icon}
                    onChange={(e) => setNewStep({ ...newStep, icon: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl"
                    placeholder="✓"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newStep.color}
                    onChange={(e) => setNewStep({ ...newStep, color: e.target.value })}
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddStep(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStep}
                disabled={!newStep.title.trim() || addingStep}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingStep ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </>
                ) : (
                  'Add Step'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
