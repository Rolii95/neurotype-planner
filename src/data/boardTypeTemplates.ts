import type { Board, BoardStep, CreateBoardInput, TimerSettings, VisualCues } from '../services/boardService';

interface BoardTypeTemplateDefinition {
  type: Board['board_type'];
  defaultTitle: string;
  defaultDescription: string;
  layout: Board['layout'];
  theme?: string;
  tags?: string[];
  steps: CreateBoardInput['steps'];
  previewSections: Array<{ title: string; summary: string }>;
  helperText?: string;
}

const baseTimerSettings: TimerSettings = {
  autoStart: false,
  allowOverrun: true,
  endNotification: {
    type: 'visual',
    intensity: 'subtle',
  },
};

const baseVisualCues = (color: string, icon: string, backgroundColor?: string): VisualCues => ({
  color,
  icon,
  backgroundColor,
});

const createExecutionState = (): BoardStep['execution_state'] => ({
  status: 'pending',
});

const visualBoardSteps: NonNullable<CreateBoardInput['steps']> = [
  {
    step_type: 'note',
    title: 'Daily Zone – Month Grid',
    description:
      'Mon\n\nTue\n\nWed\n\nThu\n\nFri\n\nSat\n\nSun\n\n🏀 ⚡ 😊 ✅ ⏳\n\n🌪 🔄 😐 💡 🌀\n\n🔄 ⚡ 😊 🎯 🛑\n\n🏀 🔄 😐 ✅ 🔀\n\n🌪 ⚡ 😊 💡 ⏳\n\n🏀 🔄 😐 🎯 🌀\n\n🔄 ⚡ 😊 ✅ 🛑\n\n🏀 🔄 😐 ✅ 🛑\n\n🌪 ⚡ 😊 💡 🔀\n\n🔄 🔄 😐 🎯 ⏳\n\n🏀 ⚡ 😊 ✅ 🌀\n\n🌪 🔄 😐 💡 🛑\n\n🏀 ⚡ 😊 🎯 🔀\n\n🔄 🔄 😐 ✅ 🛑\n\n🏀 ⚡ 😊 ✅ ⏳\n\n🌪 🔄 😐 💡 🌀\n\n🔄 ⚡ 😊 🎯 🛑\n\n🏀 🔄 😐 ✅ 🔀\n\n🌪 ⚡ 😊 💡 ⏳\n\n🏀 🔄 😐 🎯 🌀\n\n🔄 ⚡ 😊 ✅ 🛑\n\n🏀 🔄 😐 ✅ 🛑\n\n🌪 ⚡ 😊 💡 🔀\n\n🔄 🔄 😐 🎯 ⏳\n\n🏀 ⚡ 😊 ✅ 🌀\n\n🌪 🔄 😐 💡 🛑\n\n🏀 ⚡ 😊 🎯 🔀\n\n🔄 🔄 😐 ✅ 🛑\n\n(Replace emojis with your actual daily symbols from the Symbol Key)',
    duration: 0,
    order_index: 0,
    visual_cues: baseVisualCues('#2563eb', '🗓️', '#eff6ff'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Weekly Zone – Anchor Boxes',
    description:
      'Week 1: 🏀 🔄 😊 | ✅ 🎯 | 🛑 ⏳ | Focus: ____\nWeek 2: 🌪 ⚡ 😐 | 💡 🤝 | 🌀 🔀 | Focus: ____\nWeek 3: 🔄 🔄 😊 | ✅ 💡 | 🛑 ❌ | Focus: ____\nWeek 4: 🏀 ⚡ 😔 | 🎯 🤝 | ⏳ 🌀 | Focus: ____',
    duration: 0,
    order_index: 1,
    visual_cues: baseVisualCues('#7c3aed', '🗂️', '#f5f3ff'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Monthly Zone – Big Picture',
    description:
      'Month: ___________\n\nMode Balance: 🏀 __ | 🌪 __ | 🔄 __\nEnergy Pattern: ⚡ __ | 🔄 __ | 💤 __\n\nTop 3 Wins:\n1. ________________________________\n2. ________________________________\n3. ________________________________\n\nTop 3 Challenges:\n1. ________________________________\n2. ________________________________\n3. ________________________________\n\nNext Month Focus: ________________________________',
    duration: 0,
    order_index: 2,
    visual_cues: baseVisualCues('#16a34a', '📈', '#f0fdf4'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Symbol Key – Quick Reference',
    description:
      'Modes: 🏀 Niche | 🌪 Scatter | 🔄 Mixed\nEnergy: ⚡ High | 🔄 Medium | 💤 Low\nMood: 😊 Positive | 😐 Neutral | 😔 Low\n\nHighlights: ✅ Routine kept | 🎯 Goal hit | 💡 Insight | 🤝 Connection\nChallenges: ⏳ Time blindness | 🌀 Overwhelm | 🛑 Shutdown | 🔀 Switch fatigue | ❌ Routine broken\nAdjustments: ➕ Keep | 🔧 Tweak | ➖ Drop\n\nCanva Tips:\n• Copy this layout into a Canva text box\n• Replace emojis with icons\n• Add colour backgrounds per mode\n• Save as reusable template for future months',
    duration: 0,
    order_index: 3,
    visual_cues: baseVisualCues('#f97316', '🗝️', '#fff7ed'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Colour Coding Guide',
    description:
      'Suggested palette for Canva or digital boards:\n\nModes\n🏀 Niche = Blue\n🌪 Scatter = Orange\n🔄 Mixed = Purple\n\nEnergy\n⚡ High = Bright Yellow\n🔄 Medium = Soft Green\n💤 Low = Light Gray\n\nMood\n😊 Positive = Light Green\n😐 Neutral = Light Yellow\n😔 Low = Light Red\n\nHighlights\n✅ Routine Kept = Dark Green\n🎯 Goal Hit = Gold\n💡 Insight = Light Blue\n🤝 Connection = Teal\n\nChallenges\n⏳ Time Blindness = Light Orange\n🌀 Overwhelm = Coral\n🛑 Shutdown = Dark Red\n🔀 Switch Fatigue = Lavender\n❌ Routine Broken = Dark Gray\n\nAdjustments\n➕ Keep = Bright Green\n🔧 Tweak = Medium Blue\n➖ Drop = Light Brown',
    duration: 0,
    order_index: 4,
    visual_cues: baseVisualCues('#0ea5e9', '🎨', '#ecfeff'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
];

const routineBoardSteps: NonNullable<CreateBoardInput['steps']> = [
  {
    step_type: 'task',
    title: 'Warm-Up Ritual',
    description: 'Gentle start to anchor attention and energy before the main routine kicks in.',
    duration: 5,
    order_index: 0,
    visual_cues: baseVisualCues('#0ea5e9', '🌅'),
    transition_cue: {
      type: 'text',
      text: 'Take three grounding breaths and note today\'s priority.',
    },
    timer_settings: baseTimerSettings,
    neurotype_adaptations: {
      adhd: { shortBreakReminders: true, timeAwareness: 'medium' },
    },
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'task',
    title: 'Core Flow',
    description: 'Primary focus block for the routine with optional micro breaks every 15 minutes.',
    duration: 30,
    order_index: 1,
    visual_cues: baseVisualCues('#22c55e', '✅'),
    timer_settings: {
      ...baseTimerSettings,
      showWarningAt: 5,
    },
    neurotype_adaptations: {
      adhd: { hyperFocusWarning: true },
      autism: { changeWarnings: true },
    },
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Cool Down & Reflect',
    description: 'Capture quick reflections: What worked? What needs adjustment next time? Reward yourself.',
    duration: 5,
    order_index: 2,
    visual_cues: baseVisualCues('#fb7185', '🧠'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: {
      dyslexia: { audioSupport: true },
    },
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
];

const kanbanBoardSteps: NonNullable<CreateBoardInput['steps']> = [
  {
    step_type: 'note',
    title: 'Clarify Priorities',
    description: 'Capture the 3–5 most urgent focus areas for this cycle. Drop them into columns below as cards.',
    duration: 0,
    order_index: 0,
    visual_cues: baseVisualCues('#f97316', '🎯'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Column Layout',
    description: 'Ideas → Ready → In Motion → Cooling Down → Done. Drag cards across as you work.',
    duration: 0,
    order_index: 1,
    visual_cues: baseVisualCues('#2563eb', '📊'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Weekly Retro Prompt',
    description: 'What flowed easily? Where did friction or overwhelm stack up? Capture tweaks for next sprint.',
    duration: 0,
    order_index: 2,
    visual_cues: baseVisualCues('#22c55e', '🔄'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
];

const timelineBoardSteps: NonNullable<CreateBoardInput['steps']> = [
  {
    step_type: 'note',
    title: 'Phase Markers',
    description: 'Sketch the key checkpoints for the project timeline. Note dependencies or sensory considerations.',
    duration: 0,
    order_index: 0,
    visual_cues: baseVisualCues('#7c3aed', '⏱️'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Buffer Zones',
    description: 'Add intentional flex windows between milestones for rest, recalibration, or context switching.',
    duration: 0,
    order_index: 1,
    visual_cues: baseVisualCues('#f59e0b', '🧭'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
  {
    step_type: 'note',
    title: 'Post-Phase Reflection',
    description: 'Quick prompt: energy spent vs. energy gained? Any signals to tweak supports before next phase?',
    duration: 0,
    order_index: 2,
    visual_cues: baseVisualCues('#10b981', '📝'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: false,
    is_completed: false,
    execution_state: createExecutionState(),
  },
];

const customBoardSteps: NonNullable<CreateBoardInput['steps']> = [
  {
    step_type: 'note',
    title: 'Brain Dump',
    description: 'Capture everything swirling in your brain. We will shape it into structure once it is visible.',
    duration: 0,
    order_index: 0,
    visual_cues: baseVisualCues('#6b7280', '🧠'),
    timer_settings: baseTimerSettings,
    neurotype_adaptations: null,
    is_flexible: true,
    is_optional: true,
    is_completed: false,
    execution_state: createExecutionState(),
  },
];

export const BOARD_TYPE_TEMPLATES: Record<Board['board_type'], BoardTypeTemplateDefinition> = {
  routine: {
    type: 'routine',
    defaultTitle: 'Adaptive Routine Blueprint',
    defaultDescription: 'Kick off with a grounding ritual, ride the focus wave, and close with reflection prompts.',
    layout: 'linear',
    theme: 'default',
    tags: ['routine', 'focus', 'neuroadaptive'],
    steps: routineBoardSteps,
    previewSections: [
      { title: 'Warm-Up', summary: 'Breathing cue + quick priority capture before momentum building.' },
      { title: 'Core Flow', summary: 'Focus sprint with optional micro breaks and transition prompts.' },
      { title: 'Cool Down', summary: 'Reflect and celebrate so the routine ends on a positive anchor.' },
    ],
    helperText: 'Use this layout for daily anchors like morning, deep work, or evening resets.',
  },
  visual: {
    type: 'visual',
    defaultTitle: 'AuDHD Season Dashboard',
    defaultDescription: 'Track daily modes, weekly focus, and monthly patterns at a glance with symbol references.',
    layout: 'grid',
    theme: 'colorful',
    tags: ['visual', 'dashboard', 'auhd', 'seasonal'],
    steps: visualBoardSteps,
    previewSections: [
      { title: 'Daily Zone', summary: 'Month-long grid populated with your mode + energy symbols.' },
      { title: 'Weekly Zone', summary: 'Four anchor boxes for focus themes and adjustments.' },
      { title: 'Monthly Zone', summary: 'Big-picture reflection on balance, wins, and stretches.' },
      { title: 'Symbol Key', summary: 'Legend plus Canva tips for quick visual translation.' },
      { title: 'Colour Coding', summary: 'Suggested palette so your dashboard is instantly scannable.' },
    ],
    helperText: 'Great for Canva exports or printable dashboards. Swap the emoji placeholders with your icon set and apply the colour legend for instant pattern spotting.',
  },
  kanban: {
    type: 'kanban',
    defaultTitle: 'Neurodivergent Flow Kanban',
    defaultDescription: 'Column prompts emphasize context switching safety, energy pacing, and weekly retros.',
    layout: 'kanban',
    theme: 'minimal',
    tags: ['kanban', 'flow', 'weekly'],
    steps: kanbanBoardSteps,
    previewSections: [
      { title: 'Clarify', summary: 'Define high-impact tasks before the week starts.' },
      { title: 'Columns', summary: 'Progress-friendly swim lanes with cooling down buffer.' },
      { title: 'Retro', summary: 'Short reflection prompt to adjust scaffolds for next cycle.' },
    ],
    helperText: 'Duplicate cards across columns as energy shifts; pair with body doubling for accountability.',
  },
  timeline: {
    type: 'timeline',
    defaultTitle: 'Adaptive Timeline Planner',
    defaultDescription: 'Plot phases, buffer zones, and energy reflections so long projects stay humane.',
    layout: 'timeline',
    theme: 'classic',
    tags: ['timeline', 'projects', 'planning'],
    steps: timelineBoardSteps,
    previewSections: [
      { title: 'Phases', summary: 'High-level checkpoints with sensory notes.' },
      { title: 'Buffers', summary: 'Intentional breathing room for co-regulation and pivots.' },
      { title: 'Reflections', summary: 'Short prompts keep data flowing into the next milestone.' },
    ],
    helperText: 'Great for launches, exams, or seasonal planning where pacing matters.',
  },
  custom: {
    type: 'custom',
    defaultTitle: 'Blank Canvas Board',
    defaultDescription: 'Start from a flexible brain dump and layer structure as you go.',
    layout: 'freeform',
    theme: 'minimal',
    tags: ['custom', 'sandbox'],
    steps: customBoardSteps,
    previewSections: [
      { title: 'Brain Dump', summary: 'Capture raw thoughts before sorting into flows.' },
    ],
    helperText: 'Perfect when you need to experiment before locking in a format.',
  },
};
