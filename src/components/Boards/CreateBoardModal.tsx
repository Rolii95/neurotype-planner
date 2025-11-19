import { useState, useEffect } from 'react';
import { boardService, type CreateBoardInput, type Board, type BoardStep } from '../../services/boardService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { BOARD_TYPE_TEMPLATES } from '../../data/boardTypeTemplates';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (boardId: string) => void;
}

const BOARD_TYPES = [
  { value: 'routine', label: 'Routine Board', icon: '📋', description: 'Step-by-step routines' },
  { value: 'visual', label: 'Visual Board', icon: '🎨', description: 'Visual task management' },
  { value: 'kanban', label: 'Kanban Board', icon: '📊', description: 'Kanban-style workflow' },
  { value: 'timeline', label: 'Timeline', icon: '📅', description: 'Time-based planning' },
  { value: 'custom', label: 'Custom Board', icon: '⚙️', description: 'Build your own' },
];

const LAYOUTS = [
  { value: 'linear', label: 'Linear', icon: '▬' },
  { value: 'grid', label: 'Grid', icon: '▦' },
  { value: 'kanban', label: 'Kanban', icon: '▥' },
  { value: 'timeline', label: 'Timeline', icon: '━' },
  { value: 'freeform', label: 'Freeform', icon: '✨' },
];

type BoardType = Board['board_type'];
type TemplateStep = Omit<BoardStep, 'id' | 'board_id' | 'created_at' | 'updated_at'>;

const cloneTemplateSteps = (
  steps?: TemplateStep[] | CreateBoardInput['steps']
): TemplateStep[] =>
  (steps ?? []).map((rawStep) => {
    const step = rawStep as TemplateStep;
    return {
      ...step,
      visual_cues: { ...step.visual_cues },
      transition_cue: step.transition_cue ? { ...step.transition_cue } : undefined,
      timer_settings: {
        ...step.timer_settings,
        endNotification: { ...step.timer_settings.endNotification },
      },
      neurotype_adaptations: step.neurotype_adaptations
        ? JSON.parse(JSON.stringify(step.neurotype_adaptations))
        : step.neurotype_adaptations,
      execution_state: step.execution_state
        ? { ...step.execution_state }
        : { status: 'pending' },
      freeform_data: step.freeform_data ? { ...step.freeform_data } : undefined,
    };
  });

export function CreateBoardModal({ isOpen, onClose, onSuccess }: CreateBoardModalProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const defaultTemplate = BOARD_TYPE_TEMPLATES['routine'];
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateBoardInput>>({
    title: defaultTemplate.defaultTitle,
    description: defaultTemplate.defaultDescription,
    board_type: defaultTemplate.type,
    layout: defaultTemplate.layout,
    tags: defaultTemplate.tags ?? [],
    theme: defaultTemplate.theme,
  });
  const [templateSteps, setTemplateSteps] = useState<TemplateStep[]>(
    cloneTemplateSteps(defaultTemplate.steps)
  );
  const currentBoardType = (formData.board_type ?? defaultTemplate.type) as BoardType;
  const selectedTemplate = BOARD_TYPE_TEMPLATES[currentBoardType];

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const resetTemplate = BOARD_TYPE_TEMPLATES['routine'];
    setStep(1);
    setLoading(false);
    setFormData({
      title: resetTemplate.defaultTitle,
      description: resetTemplate.defaultDescription,
      board_type: resetTemplate.type,
      layout: resetTemplate.layout,
      tags: resetTemplate.tags ?? [],
      theme: resetTemplate.theme,
    });
    setTemplateSteps(cloneTemplateSteps(resetTemplate.steps));
  }, [isOpen]);

  const handleBoardTypeSelect = (typeValue: BoardType) => {
    const template = BOARD_TYPE_TEMPLATES[typeValue];
    setFormData((prev) => ({
      ...prev,
      board_type: typeValue,
      layout: template.layout,
      title: template.defaultTitle,
      description: template.defaultDescription,
      tags: template.tags ?? [],
      theme: template.theme,
    }));
    setTemplateSteps(cloneTemplateSteps(template.steps));
  };

  const handleLayoutSelect = (layoutValue: Board['layout']) => {
    setFormData((prev) => ({
      ...prev,
      layout: layoutValue,
    }));
  };

  const tagsInputValue = (formData.tags ?? []).join(', ');

  const handleCreate = async () => {
    const rawTitle = (formData.title ?? '').trim();
    if (!rawTitle) {
      return;
    }

    const preparedSteps = templateSteps.length
      ? (cloneTemplateSteps(templateSteps) as TemplateStep[])
      : undefined;

    const payload: CreateBoardInput = {
      title: rawTitle,
      description: formData.description ?? selectedTemplate?.defaultDescription ?? '',
      board_type: currentBoardType,
      layout: (formData.layout ?? selectedTemplate?.layout ?? 'linear') as Board['layout'],
      theme: formData.theme ?? selectedTemplate?.theme,
      tags: formData.tags ?? selectedTemplate?.tags ?? [],
      config: formData.config,
      schedule: formData.schedule,
      visual_settings: formData.visual_settings,
      steps: preparedSteps,
    };

    setLoading(true);
    try {
      const board = await boardService.createBoard(payload);
      if (board) {
        if (preparedSteps && preparedSteps.length > 0) {
          try {
            const existing = await boardService.getBoard(board.id);
            const existingCount = existing?.steps?.length ?? 0;
            if (existingCount < preparedSteps.length) {
              const stepsToInsert = existingCount === 0
                ? preparedSteps
                : preparedSteps.filter((step) =>
                    !existing?.steps?.some((existingStep) => existingStep.title === step.title)
                  );

              const seeded = stepsToInsert.length
                ? await boardService.addStepsToBoard(board.id, stepsToInsert)
                : [];
              if (!seeded.length) {
                console.warn('[CreateBoardModal] Failed to seed template steps for board', board.id);
                toast.error('Board created, but template sections could not be seeded. You can add steps manually.');
              }
            }
          } catch (seedError) {
            console.error('Failed to verify template steps:', seedError);
          }
        }
        onSuccess?.(board.id);
        navigate(`/boards/${board.id}`);
        onClose();
        toast.success('Board created successfully!');
      }
    } catch (error) {
      console.error('Failed to create board:', error);
      toast.error('Failed to create board. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Board
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Step {step} of 2: {step === 1 ? 'Choose Type' : 'Customize'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Board Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BOARD_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => handleBoardTypeSelect(type.value as BoardType)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        currentBoardType === type.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <div className="text-3xl mb-2">{type.icon}</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{type.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Layout Style
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {LAYOUTS.map((layout) => (
                    <button
                      key={layout.value}
                      onClick={() => handleLayoutSelect(layout.value as Board['layout'])}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        formData.layout === layout.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <div className="text-2xl">{layout.icon}</div>
                      <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">{layout.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedTemplate && (
                <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 p-4">
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    Template Snapshot
                  </div>
                  <p className="mt-2 text-sm text-blue-800 dark:text-blue-100">
                    {selectedTemplate.defaultDescription}
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedTemplate.previewSections.map((section) => (
                      <div
                        key={section.title}
                        className="text-xs text-blue-900/80 dark:text-blue-200/80"
                      >
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {section.title}:
                        </span>{' '}
                        {section.summary}
                      </div>
                    ))}
                  </div>
                  {selectedTemplate.helperText && (
                    <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">
                      {selectedTemplate.helperText}
                    </div>
                  )}
                  {templateSteps.length > 0 && (
                    <div className="mt-4 rounded-md border border-blue-200 dark:border-blue-800 bg-white/80 dark:bg-blue-950/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                        Included sections ({templateSteps.length})
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-blue-900 dark:text-blue-100">
                        {templateSteps.map((step) => (
                          <li key={`${step.order_index}-${step.title}`} className="flex items-start gap-2">
                            <span className="mt-0.5 text-base leading-none">
                              {step.visual_cues?.icon || '•'}
                            </span>
                            <div>
                              <div className="font-medium">{step.title}</div>
                              {step.description && (
                                <div className="text-[11px] text-blue-800/80 dark:text-blue-200/70 overflow-hidden text-ellipsis whitespace-nowrap">
                                  {step.description.replace(/\n+/g, ' ').trim()}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {selectedTemplate && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Template Sections ({templateSteps.length})
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    You can refine the prebuilt sections on the board after creation.
                  </p>
                  {templateSteps.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                      {templateSteps.map((step) => (
                        <li
                          key={`${step.order_index}-${step.title}`}
                          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            <span>{step.visual_cues?.icon || '•'}</span>
                            <span>{step.title}</span>
                          </div>
                          {step.description && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line max-h-24 overflow-y-auto pr-1">
                              {step.description}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Board Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="e.g., Morning Routine"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What's this board for?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  placeholder="morning, productivity, wellness"
                  value={tagsInputValue}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tags: e.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Tip:</strong> You'll be able to add steps and customize your board after creation.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!formData.board_type}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.title || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {loading ? 'Creating...' : 'Create Board'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
