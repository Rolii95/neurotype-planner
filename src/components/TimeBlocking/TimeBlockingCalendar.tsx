import { useMemo, useState, useEffect } from 'react';
import { format, addDays, startOfWeek, parseISO, isSameDay } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import {
  ClockIcon,
  XMarkIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  LightBulbIcon,
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useMatrixStore } from '../../stores/useMatrixStore';
import { Task } from '../../types';
import { useAvailableTemplates } from '../../hooks/useAvailableTemplates';
import { TaskTemplate } from '../../constants/taskTemplates';
import { useToast } from '../../contexts/ToastContext';

interface TimeBlockingCalendarProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

interface TimeSlot {
  hour: number;
  isPast: boolean;
  blocks: TimeBlock[];
}

interface TimeBlock {
  id: string;
  taskId: string;
  task: Task;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  isRecurring: boolean;
}

export const TimeBlockingCalendar: React.FC<TimeBlockingCalendarProps> = ({
  selectedDate = new Date(),
  onDateChange
}) => {
  const { tasks, timeBlocks, createTimeBlock, deleteTimeBlock, addTask, applyTemplate, moveTask } = useMatrixStore();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ hour: number; date: Date } | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [createNewTask, setCreateNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(60);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [leftPanelTab, setLeftPanelTab] = useState<'today' | 'templates' | 'insights'>('today');
  const [showEnergyOverlay, setShowEnergyOverlay] = useState(true);
  const [isPlanning, setIsPlanning] = useState(false);
  const toast = useToast();
  const [existingSelectedTaskId, setExistingSelectedTaskId] = useState<string>('');
  const [prefillMode, setPrefillMode] = useState<boolean>(false);
  const timeBlockingTarget = useMatrixStore((s) => s.timeBlockingTarget);
  const clearTimeBlockingTarget = useMatrixStore((s) => s.clearTimeBlockingTarget);

  const templates = useAvailableTemplates();
  const selectedTemplate: TaskTemplate | null = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find(template => template.id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  const workingHours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM

  // Get time blocks for the selected date
const getTimeBlocksForDate = (date: Date): TimeBlock[] => {
  return timeBlocks
    .filter(block => isSameDay(parseISO(block.startTime), date))
      .map(block => {
        const task = tasks.find(t => t.id === block.taskId);
        if (!task) return null;

        const startTime = parseISO(block.startTime);
        const endTime = parseISO(block.endTime);
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

        return {
          ...block,
          task,
          duration
        };
      })
      .filter(Boolean) as TimeBlock[];
};

  const todaysBlocks = useMemo(() => getTimeBlocksForDate(currentDate), [currentDate, timeBlocks]);
  const todaysTaskIds = useMemo(() => new Set(todaysBlocks.map(block => block.taskId)), [todaysBlocks]);
  const backlogTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.status !== 'completed' && !todaysTaskIds.has(task.id)
      ),
    [tasks, todaysTaskIds]
  );
  const scheduledMinutes = useMemo(
    () => todaysBlocks.reduce((sum, block) => sum + block.duration, 0),
    [todaysBlocks]
  );
  const dayCapacityMinutes = workingHours.length * 60;
  const plannedPercentage = dayCapacityMinutes
    ? Math.min(100, Math.round((scheduledMinutes / dayCapacityMinutes) * 100))
    : 0;
  const backlogMinutes = useMemo(
    () => backlogTasks.reduce((sum, task) => sum + (task.estimated_duration || 60), 0),
    [backlogTasks]
  );
  const templateSuggestions = useMemo(() => templates.slice(0, 5), [templates]);
  const upcomingBlocks = useMemo(
    () =>
      [...todaysBlocks]
        .sort(
          (a, b) =>
            parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
        )
        .slice(0, 3),
    [todaysBlocks]
  );
  const energyBands = useMemo(
    () => [
      {
        label: 'High focus',
        start: 8,
        end: 11,
        background: 'from-amber-50 via-amber-50/70 to-transparent',
        text: 'text-amber-700',
      },
      {
        label: 'Recharge',
        start: 11,
        end: 13,
        background: 'from-sky-50 via-white to-transparent',
        text: 'text-sky-700',
      },
      {
        label: 'Deep work',
        start: 13,
        end: 16,
        background: 'from-indigo-50 via-indigo-50/70 to-transparent',
        text: 'text-indigo-700',
      },
      {
        label: 'Flex',
        start: 16,
        end: 19,
        background: 'from-emerald-50 via-white to-transparent',
        text: 'text-emerald-700',
      },
    ],
    [currentDate]
  );

  const getPriorityScore = (task: Task) => {
    switch (task.priority) {
      case 'high':
        return 0;
      case 'medium':
        return 1;
      default:
        return 2;
    }
  };

  const backlogGroups = useMemo(() => {
    const quadrantLabels: Record<string, string> = {
      'urgent-important': 'Critical focus',
      'urgent-not-important': 'Quick response',
      'not-urgent-important': 'Deep work',
      'not-urgent-not-important': 'Maintenance',
      flex: 'Flexible backlog',
    };

    const grouped = backlogTasks.reduce<Record<string, Task[]>>((acc, task) => {
      const key = task.quadrant ?? 'flex';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(task);
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, items]) => ({
      key,
      title: quadrantLabels[key] ?? quadrantLabels.flex,
      tasks: [...items].sort((a, b) => getPriorityScore(a) - getPriorityScore(b)),
    }));
  }, [backlogTasks]);

  const plannerInsights = useMemo(
    () => [
      {
        title: 'Focus time planned',
        value: `${scheduledMinutes} min`,
        helper: `${plannedPercentage}% of your target`,
        accent: 'text-blue-600',
      },
      {
        title: 'Backlog remaining',
        value: `${backlogTasks.length} tasks`,
        helper: `${backlogMinutes} min unscheduled`,
        accent: 'text-amber-600',
      },
      {
        title: 'Open space',
        value: `${Math.max(dayCapacityMinutes - scheduledMinutes, 0)} min`,
        helper: 'Available for new blocks',
        accent: 'text-emerald-600',
      },
    ],
    [scheduledMinutes, plannedPercentage, backlogTasks.length, backlogMinutes, dayCapacityMinutes]
  );

  const findAvailableSlot = (
    durationMinutes: number,
    windows: Array<{ start: number; end: number }>
  ) => {
    const slotDuration = durationMinutes * 60 * 1000;
    const startHour = workingHours[0];
    const endHour = workingHours[workingHours.length - 1] + 1;
    const dayStart = new Date(currentDate);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endHour, 0, 0, 0);

    for (
      let pointer = dayStart.getTime();
      pointer + slotDuration <= dayEnd.getTime();
      pointer += 15 * 60 * 1000
    ) {
      const pointerEnd = pointer + slotDuration;
      const overlaps = windows.some(
        (window) => pointer < window.end && pointerEnd > window.start
      );
      if (!overlaps) {
        return {
          start: new Date(pointer),
          end: new Date(pointerEnd),
        };
      }
    }
    return null;
  };

  const handleAutoPlan = async () => {
    if (!backlogTasks.length) {
      toast.info('Nothing left to schedule. Great job!');
      return;
    }

    setIsPlanning(true);
    try {
      const prioritized = [...backlogTasks]
        .sort((a, b) => getPriorityScore(a) - getPriorityScore(b))
        .slice(0, 6);
      const windows = todaysBlocks.map((block) => ({
        start: parseISO(block.startTime).getTime(),
        end: parseISO(block.endTime).getTime(),
      }));
      let scheduledCount = 0;

      for (const task of prioritized) {
        const duration = Math.max(30, task.estimated_duration ?? 60);
        const placement = findAvailableSlot(duration, windows);
        if (!placement) {
          continue;
        }

        await createTimeBlock(
          task.id,
          placement.start.toISOString(),
          placement.end.toISOString()
        );
        windows.push({
          start: placement.start.getTime(),
          end: placement.end.getTime(),
        });
        scheduledCount += 1;
      }

      if (scheduledCount === 0) {
        toast.info('No open space left to place tasks today.');
      } else {
        toast.success(`Planned ${scheduledCount} task${scheduledCount > 1 ? 's' : ''} for you.`);
      }
    } catch (error) {
      console.error('Failed to auto plan day:', error);
      toast.error('Unable to plan your day automatically. Try again in a moment.');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleTemplateQuickAdd = async (template: TaskTemplate) => {
    try {
      await applyTemplate(template.id, {
        title: template.name,
        estimated_duration: template.estimatedDuration,
        priority: template.defaultPriority,
        category: template.category === 'custom' ? undefined : template.category,
      });
      toast.success(`Added “${template.name}” to your backlog.`);
    } catch (error) {
      console.error('Failed to apply template quickly:', error);
      toast.error('Unable to add that template right now.');
    }
  };

  // Respond to quick-schedule targets from other UI (TaskCard)
  useEffect(() => {
    if (!timeBlockingTarget || !timeBlockingTarget.taskId) return;

    // Prefill a slot (use provided startTime if available, else use next hour)
    try {
      const targetDate = timeBlockingTarget.date ? new Date(timeBlockingTarget.date) : new Date();
      const hour = timeBlockingTarget.startTime ? new Date(timeBlockingTarget.startTime).getHours() : new Date().getHours();
      setSelectedSlot({ hour, date: targetDate });
      setCreateNewTask(false);
      setExistingSelectedTaskId(timeBlockingTarget.taskId);
      setPrefillMode(true);
      setShowCreateModal(true);
      // Do not auto-clear target here; wait until user schedules or cancels
    } catch (err) {
      console.error('Failed to apply timeBlockingTarget:', err);
    }
  }, [timeBlockingTarget]);

  // Get time slots for the current view
  const getTimeSlots = (): TimeSlot[] => {
    const now = new Date();
    const blocks = todaysBlocks;

    return workingHours.map(hour => {
      const slotDate = new Date(currentDate);
      slotDate.setHours(hour, 0, 0, 0);
      
      const slotBlocks = blocks.filter(block => {
        const blockStart = parseISO(block.startTime);
        return blockStart.getHours() === hour;
      });

      return {
        hour,
        isPast: slotDate < now,
        blocks: slotBlocks
      };
    });
  };

  // Handle dropping a task onto a time slot
  const handleTaskDrop = async (taskId: string, hour: number, date: Date) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + (task.estimated_duration || 60));

    try {
      await createTimeBlock(taskId, startTime.toISOString(), endTime.toISOString());
    } catch (error) {
      console.error('Failed to create time block:', error);
    }
  };

  // Handle drag over time slot
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent, hour: number, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    handleTaskDrop(taskId, hour, date);
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-8 gap-1 h-full">
        {/* Time column */}
        <div className="col-span-1">
          <div className="h-12 border-b border-gray-200"></div>
              {workingHours.map(hour => (
            <div key={hour} className="h-16 border-b border-gray-200 flex items-center justify-center text-sm text-gray-500">
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>

        {/* Days columns */}
        {weekDays.map((day, dayIndex) => (
          <div key={dayIndex} className="col-span-1">
            {/* Day header */}
            <div className="h-12 border-b border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {format(day, 'EEE')}
                </div>
                <div className="text-sm text-gray-500">
                  {format(day, 'd')}
                </div>
              </div>
            </div>

            {/* Time slots */}
            {workingHours.map(hour => {
              const blocks = getTimeBlocksForDate(day).filter(block => 
                parseISO(block.startTime).getHours() === hour
              );
              const slotStart = new Date(day);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(slotStart);
              slotEnd.setMinutes(slotEnd.getMinutes() + 60);

              return (
                <CalendarSlot
                  key={hour}
                  start={slotStart}
                  end={slotEnd}
                  className="h-16 border-b border-r border-gray-200 relative p-1"
                >
                  {blocks.map(block => (
                    <div
                      key={block.id}
                      className="absolute inset-1 bg-blue-100 border border-blue-300 rounded p-1 text-xs overflow-hidden"
                      style={{
                        height: `${Math.min(block.duration / 60 * 4, 3.5)}rem`
                      }}
                    >
                      <div className="font-medium text-blue-900 truncate">
                        {block.task.title}
                      </div>
                      <div className="text-blue-700 truncate">
                        {format(parseISO(block.startTime), 'h:mm a')}
                      </div>
                      <button
                        onClick={() => deleteTimeBlock(block.id)}
                        className="absolute top-0 right-0 text-blue-600 hover:text-red-600"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </CalendarSlot>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Small wrapper component that exposes a droppable calendar-slot for dnd-kit
  const CalendarSlot: React.FC<{
    start: Date;
    end: Date;
    className?: string;
    children?: React.ReactNode;
  }> = ({ start, end, className = '', children }) => {
    const id = `calendar-slot-${format(start, "yyyy-MM-dd-HH")}`;
    const { setNodeRef, isOver } = useDroppable({
      id,
      data: { type: 'calendar-slot', start: start.toISOString(), end: end.toISOString() },
    });

    const hoverClasses = isOver
      ? 'ring-2 ring-blue-400 ring-opacity-60 bg-blue-50/60 border-blue-300'
      : '';

    return (
      <div
        ref={setNodeRef as any}
        className={`${className} transition-all duration-150 ease-in-out relative ${hoverClasses}`}
        aria-label={`Calendar slot ${format(start, 'yyyy-MM-dd HH')}`}
        data-calendar-slot-id={id}
      >
        {/* Hover indicator layer for accessibility and visual feedback */}
        {isOver && (
          <div className="absolute inset-0 pointer-events-none rounded-md" />
        )}
        {children}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const timeSlots = getTimeSlots();

    return (
      <div className="space-y-1">
            {timeSlots.map((slot) => {
          const activeBand =
            showEnergyOverlay &&
            energyBands.find(
              (band) => slot.hour >= band.start && slot.hour < band.end
            );
              const slotStart = new Date(currentDate);
              slotStart.setHours(slot.hour, 0, 0, 0);
              const slotEnd = new Date(slotStart);
              slotEnd.setMinutes(slotEnd.getMinutes() + 60);

          return (
            <CalendarSlot
              key={slot.hour}
              start={slotStart}
              end={slotEnd}
              className={`flex items-stretch min-h-16 border rounded-lg relative ${
                slot.isPast ? 'bg-gray-50' : 'bg-white'
              } ${
                activeBand
                  ? `bg-gradient-to-r ${activeBand.background} border-blue-100/80`
                  : 'border-gray-200'
              }`}
            >
              {/* Time label */}
              <div className="w-20 flex items-center justify-center text-sm text-gray-500 border-r border-gray-200">
                {format(new Date().setHours(slot.hour, 0, 0, 0), 'h a')}
              </div>

              {/* Time slot content */}
              <div className="flex-1 p-2 relative">
                {activeBand && (
                  <div
                    className={`absolute top-1 right-4 flex items-center gap-1 text-xs font-medium ${activeBand.text}`}
                  >
                    <BoltIcon className="h-3.5 w-3.5" />
                    {activeBand.label}
                  </div>
                )}
                {slot.blocks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Drop a task here or{' '}
                    <button
                      onClick={() => {
                        setSelectedSlot({ hour: slot.hour, date: currentDate });
                        setShowCreateModal(true);
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800 underline"
                    >
                      click to schedule
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {slot.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="bg-blue-100 border border-blue-300 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-900">
                              {block.task.title}
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                              {format(parseISO(block.startTime), 'h:mm a')} -{' '}
                              {format(parseISO(block.endTime), 'h:mm a')}
                            </p>
                            {block.task.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {block.task.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteTimeBlock(block.id)}
                            className="text-blue-600 hover:text-red-600 p-1"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Neurotype adaptations */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {block.duration}min
                          </span>
                          {block.task.priority === 'urgent' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CalendarSlot>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today's plan</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {Math.round(scheduledMinutes / 60)}h planned
                </p>
                <p className="text-sm text-gray-500">Capacity used: {plannedPercentage}%</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                <CalendarDaysIcon className="h-6 w-6" />
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Scheduled blocks</dt>
                <dd className="text-lg font-semibold text-gray-900">{todaysBlocks.length}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Backlog</dt>
                <dd className="text-lg font-semibold text-gray-900">{backlogTasks.length} tasks</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Backlog & tools</p>
                <p className="text-xs text-gray-500">Drag to schedule or start with a template.</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 p-1 text-sm font-medium">
              {(['today', 'templates', 'insights'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLeftPanelTab(tab)}
                  className={`flex-1 rounded-lg px-3 py-1 ${
                    leftPanelTab === tab
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab === 'today' ? 'Today' : tab === 'templates' ? 'Templates' : 'Insights'}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-4">
              {leftPanelTab === 'today' && (
                <>
                  {backlogGroups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                      Everything for today is scheduled. 🎉
                    </div>
                  ) : (
                    backlogGroups.map((group) => (
                      <div key={group.key} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">{group.title}</p>
                          <span className="text-xs text-gray-500">
                            {group.tasks.reduce((sum, task) => sum + (task.estimated_duration || 60), 0)} min
                          </span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {group.tasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                                e.dataTransfer.setData('text/plain', task.id);
                                setDraggedTask(task);
                              }}
                              onDragEnd={() => setDraggedTask(null)}
                              className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2 text-sm shadow-sm transition hover:bg-white"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{task.title}</p>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                      <ClockIcon className="h-3 w-3" />
                                      {task.priority}
                                    </span>
                                    {task.energy_required && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                        {task.energy_required} energy
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{task.estimated_duration || 60}m</span>
                                  <select
                                    value={task.quadrant ?? 'flex'}
                                    onChange={async (e) => {
                                      const target = e.target.value as any;
                                      try {
                                        // If the selection is 'flex' skip
                                        if (target === 'flex') return;
                                        await moveTask(task.id, target);
                                      } catch (err) {
                                        console.error('Failed to change quadrant from backlog:', err);
                                      }
                                    }}
                                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                                    title="Change quadrant"
                                  >
                                    <option value="urgent-important">Do First</option>
                                    <option value="not-urgent-important">Schedule</option>
                                    <option value="urgent-not-important">Park</option>
                                    <option value="not-urgent-not-important">Eliminate</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {leftPanelTab === 'templates' && (
                <div className="space-y-3">
                  {templateSuggestions.map((template) => (
                    <div key={template.id} className="rounded-xl border border-gray-100 p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500">
                            {template.estimatedDuration} min · {template.category}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleTemplateQuickAdd(template)}
                          className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          Add to backlog
                        </button>
                      </div>
                      {template.description && (
                        <p className="mt-2 text-xs text-gray-500">{template.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {leftPanelTab === 'insights' && (
                <div className="space-y-3">
                  {plannerInsights.map((insight) => (
                    <div key={insight.title} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">{insight.title}</p>
                      <p className={`mt-2 text-xl font-semibold ${insight.accent}`}>{insight.value}</p>
                      <p className="text-xs text-gray-500">{insight.helper}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Upcoming anchors</p>
                <p className="text-xs text-gray-500">Stay ahead of transitions.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnergyOverlay((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  showEnergyOverlay
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:text-gray-800'
                }`}
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                Energy overlay
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {upcomingBlocks.length === 0 ? (
                <p className="text-sm text-gray-500">No anchors scheduled for today.</p>
              ) : (
                upcomingBlocks.map((block) => (
                  <div key={block.id} className="rounded-xl border border-gray-100 p-3">
                    <p className="text-sm font-medium text-gray-900">{block.task.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(block.startTime), 'h:mm a')} · {block.duration} min
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Adaptive calendar</p>
              <p className="text-xl font-semibold text-gray-900">Time blocking lab</p>
              <p className="text-sm text-gray-500">Balance energy, anchors, and focus work.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-full border border-gray-200">
                <button
                  onClick={() => setViewMode('day')}
                  className={`rounded-l-full px-3 py-1 text-sm font-medium ${
                    viewMode === 'day'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`rounded-r-full px-3 py-1 text-sm font-medium ${
                    viewMode === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Week
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleAutoPlan()}
                disabled={isPlanning}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <SparklesIcon className="h-4 w-4" />
                {isPlanning ? 'Planning…' : 'Plan my day'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newDate = addDays(currentDate, viewMode === 'day' ? -1 : -7);
                  setCurrentDate(newDate);
                  onDateChange?.(newDate);
                }}
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-50"
              >
                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
              </button>
              <div className="min-w-[200px] text-center text-lg font-semibold text-gray-900">
                {viewMode === 'day'
                  ? format(currentDate, 'EEEE, MMMM d, yyyy')
                  : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newDate = addDays(currentDate, viewMode === 'day' ? 1 : 7);
                  setCurrentDate(newDate);
                  onDateChange?.(newDate);
                }}
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-50"
              >
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  onDateChange?.(today);
                }}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LightBulbIcon className="h-4 w-4 text-amber-500" />
              {backlogMinutes} min unscheduled · drag tasks into open slots
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto p-4">
            {viewMode === 'day' ? renderDayView() : renderWeekView()}
          </div>
        </section>
      </div>

      {/* Create Time Block Modal */}
      {showCreateModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Schedule Task
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSlot(null);
                  setCreateNewTask(false);
                  setNewTaskTitle('');
                  setNewTaskDuration(60);
                  setSelectedTemplateId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Time: {format(new Date().setHours(selectedSlot.hour, 0, 0, 0), 'h:mm a')}
                </p>
                <p className="text-sm text-gray-600">
                  Date: {format(selectedSlot.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              {/* Toggle between existing and new task */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => {
                    setCreateNewTask(false);
                    setSelectedTemplateId('');
                    setNewTaskTitle('');
                    setNewTaskDuration(60);
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    !createNewTask
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Existing Task
                </button>
                <button
                  onClick={() => setCreateNewTask(true)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    createNewTask
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  New Task
                </button>
              </div>

              {/* Existing task selector */}
              {!createNewTask ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Task
                  </label>
                  <select
                    value={existingSelectedTaskId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      // If this modal was opened via quick-schedule prefill, do not auto-schedule on change.
                      if (prefillMode) {
                        setExistingSelectedTaskId(val);
                        return;
                      }

                      if (val) {
                        handleTaskDrop(val, selectedSlot.hour, selectedSlot.date);
                        setShowCreateModal(false);
                        setSelectedSlot(null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Choose a task...</option>
                    {tasks
                      .filter(task => !timeBlocks.some(block => block.taskId === task.id))
                      .map(task => (
                        <option key={task.id} value={task.id}>
                          {task.title} ({task.estimated_duration || 60} min)
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                /* New task form */
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start from Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTemplateId(value);

                        if (!value) {
                          setNewTaskTitle('');
                          setNewTaskDuration(60);
                          return;
                        }

                        const template = templates.find(t => t.id === value);
                        if (template) {
                          setNewTaskTitle(template.name);
                          setNewTaskDuration(template.estimatedDuration);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No template (start from scratch)</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} • {template.estimatedDuration} min
                        </option>
                      ))}
                    </select>
                    {selectedTemplate && (
                      <p className="mt-2 text-xs text-gray-500">
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task Name
                    </label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Enter task name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={newTaskDuration}
                      onChange={(e) => setNewTaskDuration(parseInt(e.target.value) || 60)}
                      min="15"
                      step="15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedSlot(null);
                    setCreateNewTask(false);
                    setNewTaskTitle('');
                    setNewTaskDuration(60);
                    setSelectedTemplateId('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                {createNewTask && (
                  <button
                    onClick={async () => {
                      if (!selectedSlot) return;
                      if (!selectedTemplate && !newTaskTitle.trim()) return;
                      
                      try {
                        let createdTask: Task | null = null;

                        if (selectedTemplate && selectedTemplateId) {
                          createdTask = await applyTemplate(selectedTemplateId, {
                            title: newTaskTitle.trim() || selectedTemplate.name,
                            estimated_duration: newTaskDuration,
                            priority: selectedTemplate.defaultPriority,
                            category: selectedTemplate.category === 'custom' ? undefined : selectedTemplate.category,
                          });
                          if (!createdTask) {
                            throw new Error('Failed to create a task from the selected template.');
                          }
                        } else {
                          createdTask = await addTask({
                            title: newTaskTitle.trim(),
                            description: '',
                            priority: 'medium',
                            status: 'not-started',
                            category: 'work',
                            estimated_duration: newTaskDuration,
                            quadrant: 'not-urgent-important',
                            buffer_time: 0,
                            energy_required: 'medium',
                            focus_required: 'medium',
                            sensory_considerations: []
                          });
                        }
                        
                        if (!createdTask?.id) {
                          throw new Error('Task could not be created.');
                        }

                        const startTime = new Date(selectedSlot.date);
                        startTime.setHours(selectedSlot.hour, 0, 0, 0);

                        const endTime = new Date(startTime);
                        endTime.setMinutes(endTime.getMinutes() + newTaskDuration);

                        await createTimeBlock(createdTask.id, startTime.toISOString(), endTime.toISOString());
                        toast.success('Task created and scheduled successfully.');
                        
                        // Close modal and reset
                        setShowCreateModal(false);
                        setSelectedSlot(null);
                        setCreateNewTask(false);
                        setNewTaskTitle('');
                        setNewTaskDuration(60);
                        setSelectedTemplateId('');
                      } catch (error) {
                        console.error('Failed to create and schedule task:', error);
                        toast.error(error instanceof Error ? error.message : 'Failed to create and schedule task.');
                      }
                    }}
                    disabled={!selectedTemplateId && !newTaskTitle.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create & Schedule
                  </button>
                )}

                {/* Schedule existing prefilled task when coming from quick-schedule */}
                {!createNewTask && existingSelectedTaskId && (
                  <button
                    onClick={async () => {
                      if (!selectedSlot) return;
                      try {
                        await handleTaskDrop(existingSelectedTaskId, selectedSlot.hour, selectedSlot.date);
                        toast.success('Task scheduled.');
                        // Reset modal and prefill state
                        setShowCreateModal(false);
                        setSelectedSlot(null);
                        setExistingSelectedTaskId('');
                        setPrefillMode(false);
                        clearTimeBlockingTarget();
                      } catch (err) {
                        console.error('Failed to schedule prefilled task:', err);
                        toast.error('Unable to schedule task.');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Schedule
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
