import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { boardService, Board } from '../services/boardService';
import { CreateBoardModal } from '../components/Boards/CreateBoardModal';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

const BOARD_TYPE_ICONS: Record<string, string> = {
  routine: '📋',
  visual: '🎨',
  kanban: '📊',
  timeline: '📅',
  custom: '⚙️',
};

interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  estimated_duration: number;
  tags: string[];
  neurotype_optimized: string[];
  usage_count: number;
  rating: number;
}

export function BoardsPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [boards, setBoards] = useState<Board[]>([]);
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'templates'>('all');
  const [templateCategory, setTemplateCategory] = useState<string | undefined>(undefined);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<string | null>(null);
  const [duplicatingBoard, setDuplicatingBoard] = useState<string | null>(null);
  const [deletedBoards, setDeletedBoards] = useState<Map<string, {board: Board, timeoutId: NodeJS.Timeout}>>(new Map());

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    const knownExtensionMessages = ['Extension context invalidated'];

    const suppressIfKnown = (message?: string) =>
      message && knownExtensionMessages.some((text) => message.includes(text));

    const handleError = (event: ErrorEvent) => {
      if (suppressIfKnown(event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonMessage =
        (event.reason && (event.reason.message || String(event.reason))) || '';
      if (suppressIfKnown(reasonMessage)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const loadBoards = async () => {
    setLoading(true);
    try {
      const data = await boardService.getUserBoards();
      setBoards(data);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async (category?: string) => {
    setTemplatesLoading(true);
    try {
      const data = await boardService.getTemplates(category);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string, templateName: string) => {
    setCreatingFromTemplate(templateId);
    try {
      const newBoard = await boardService.createFromTemplate(templateId, templateName);
      if (newBoard) {
        setBoards([newBoard, ...boards]);
        setShowTemplateLibrary(false);
        toast.success(`Board "${templateName}" created from template!`);
      } else {
        toast.error('Failed to create board from template');
      }
    } catch (error) {
      console.error('Failed to create from template:', error);
      toast.error('Failed to create board from template');
    } finally {
      setCreatingFromTemplate(null);
    }
  };

  const handleBrowseTemplates = () => {
    setShowTemplateLibrary(true);
    loadTemplates();
  };

  const handleDelete = async (boardId: string) => {
    // Find the board data before deletion
    const boardToDelete = boards.find(b => b.id === boardId);
    if (!boardToDelete) return;

    const confirmed = await confirm.confirm({
      title: 'Delete Board',
      message: `Are you sure you want to delete "${boardToDelete.title}"? You can undo this action within 5 seconds.`,
      type: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });

    if (!confirmed) return;

    setDeletingBoard(boardId);
    try {
      const success = await boardService.deleteBoard(boardId);
      if (success) {
        // Remove from UI immediately
        setBoards(boards.filter(b => b.id !== boardId));
        
        // Set up undo functionality with timeout
        const timeoutId = setTimeout(() => {
          // Permanently clean up after 5 seconds
          setDeletedBoards(prev => {
            const newMap = new Map(prev);
            newMap.delete(boardId);
            return newMap;
          });
        }, 5000);

        // Store the deleted board for potential undo
        setDeletedBoards(prev => {
          const newMap = new Map(prev);
          newMap.set(boardId, { board: boardToDelete, timeoutId });
          return newMap;
        });

        // Show success toast with undo action
        toast.showToast(
          `Board "${boardToDelete.title}" deleted`,
          'success',
          5000,
          {
            label: 'Undo',
            onClick: async () => {
              const deletedData = deletedBoards.get(boardId);
              if (deletedData) {
                // Clear the timeout
                clearTimeout(deletedData.timeoutId);
                
                // Restore the board by creating a new one with the same data
                try {
                  const restoredBoard = await boardService.createBoard({
                    title: deletedData.board.title,
                    description: deletedData.board.description || '',
                    board_type: deletedData.board.board_type,
                    tags: deletedData.board.tags || []
                  });
                  
                  if (restoredBoard) {
                    // Add back to boards list
                    setBoards(prev => [restoredBoard, ...prev]);
                    
                    // Remove from deleted map
                    setDeletedBoards(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(boardId);
                      return newMap;
                    });
                    
                    toast.success(`Board "${deletedData.board.title}" restored`);
                  } else {
                    toast.error('Failed to restore board');
                  }
                } catch (error) {
                  console.error('Failed to restore board:', error);
                  toast.error('Failed to restore board');
                }
              }
            }
          }
        );
      } else {
        toast.error('Failed to delete board');
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
      toast.error('Failed to delete board');
    } finally {
      setDeletingBoard(null);
    }
  };

  const handleDuplicate = async (boardId: string) => {
    setDuplicatingBoard(boardId);
    try {
      const newBoard = await boardService.duplicateBoard(boardId);
      if (newBoard) {
        setBoards([newBoard, ...boards]);
        toast.success('Board duplicated successfully');
      } else {
        toast.error('Failed to duplicate board');
      }
    } catch (error) {
      console.error('Failed to duplicate board:', error);
      toast.error('Failed to duplicate board');
    } finally {
      setDuplicatingBoard(null);
    }
  };

  const filteredBoards = boards.filter(board => {
    if (filter === 'active') return board.is_active;
    if (filter === 'templates') return board.is_template;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Boards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage your visual routine boards
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All ({boards.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Active ({boards.filter(b => b.is_active).length})
            </button>
            <button
              onClick={() => setFilter('templates')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'templates'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Templates ({boards.filter(b => b.is_template).length})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleBrowseTemplates}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Browse Templates
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Board
            </button>
          </div>
        </div>

        {/* Boards Grid */}
        {filteredBoards.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No boards yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first board to get started with visual routines
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 overflow-hidden group"
              >
                <Link to={`/boards/${board.id}`} className="block">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-4xl">{BOARD_TYPE_ICONS[board.board_type] || '📋'}</div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        board.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {board.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {board.title}
                    </h3>
                    {board.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {board.total_executions}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Executions</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {board.completion_rate ? `${Math.round(board.completion_rate * 100)}%` : '--'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Completion</div>
                      </div>
                    </div>

                    {/* Tags */}
                    {board.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {board.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {board.tags.length > 3 && (
                          <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                            +{board.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {board.last_executed_at && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last used: {new Date(board.last_executed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Actions */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <Link
                    to={`/boards/${board.id}`}
                    className="flex-1 px-3 py-2 text-sm text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDuplicate(board.id);
                    }}
                    disabled={duplicatingBoard === board.id}
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Duplicate"
                  >
                    {duplicatingBoard === board.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(board.id);
                    }}
                    disabled={deletingBoard === board.id}
                    className="px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete"
                  >
                    {deletingBoard === board.id ? (
                      <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadBoards}
      />

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📚 Template Library
                </h2>
                <button
                  onClick={() => setShowTemplateLibrary(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setTemplateCategory(undefined);
                    loadTemplates();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    !templateCategory
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                {['morning', 'evening', 'work', 'self-care', 'exercise', 'study', 'custom'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setTemplateCategory(cat);
                      loadTemplates(cat);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${
                      templateCategory === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="p-6">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                  <div className="text-6xl mb-4">🔍</div>
                  <p>No templates found in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          template.difficulty === 'beginner'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : template.difficulty === 'intermediate'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {template.difficulty}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>⏱️ {template.estimated_duration} min</span>
                        <span>👥 {template.usage_count} uses</span>
                      </div>

                      {/* Neurotype Tags */}
                      {template.neurotype_optimized && template.neurotype_optimized.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {template.neurotype_optimized.map((nt) => (
                            <span
                              key={nt}
                              className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
                            >
                              {nt}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Tags */}
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {template.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                          {template.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                              +{template.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => handleCreateFromTemplate(template.id, template.name)}
                        disabled={creatingFromTemplate === template.id}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {creatingFromTemplate === template.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating...
                          </>
                        ) : (
                          'Use This Template'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardsPage;
