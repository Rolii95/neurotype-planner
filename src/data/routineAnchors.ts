import { RoutineAnchor } from '../types/routine';

const BASE_TIMESTAMP = '2024-01-01T00:00:00.000Z';

export const DEFAULT_ROUTINE_ANCHORS: RoutineAnchor[] = [
  {
    id: 'anchor-morning-gentle-start',
    name: 'Gentle Morning Start',
    category: 'Morning Foundations',
    description: 'Ease into the day with hydration, sensory check-in, and planning cues.',
    icon: 'sunrise',
    tags: ['morning', 'executive-function', 'sensory'],
    estimatedDuration: 25,
    steps: [
      {
        title: 'Hydrate and Wake Body',
        duration: 5,
        description: 'Drink water, stretch lightly, and notice your breathing.',
        type: 'routine',
        visualCues: {
          icon: 'water',
        },
        neurotypeNotes: 'Gentle proprioceptive input helps reduce morning overwhelm.',
      },
      {
        title: 'Sensory Check-In',
        duration: 8,
        description: 'Note current sensory needs. Adjust lighting, sound, and temperature.',
        type: 'note',
        visualCues: {
          icon: 'audio',
        },
      },
      {
        title: 'Anchor the Day',
        duration: 12,
        description: 'Review calendar highlights and identify one priority focus.',
        type: 'routine',
        visualCues: {
          icon: 'calendar',
        },
      },
    ],
    benefits: ['Reduces decision fatigue', 'Builds predictable structure', 'Supports sensory regulation'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: 'anchor-deep-work-launch',
    name: 'Deep Work Launch',
    category: 'Focus Boosters',
    description: 'Prime attention and minimize friction before a deep work block.',
    icon: 'rocket',
    tags: ['focus', 'adhd', 'transition'],
    estimatedDuration: 20,
    steps: [
      {
        title: 'Brain Dump Quick List',
        duration: 5,
        description: 'Capture nagging thoughts on paper to clear working memory.',
        type: 'note',
        visualCues: {
          icon: 'mind',
        },
      },
      {
        title: 'Environment Reset',
        duration: 7,
        description: 'Adjust workspace, silence notifications, set lighting and music.',
        type: 'routine',
        visualCues: {
          icon: 'environment',
        },
      },
      {
        title: 'Intentional Start Cue',
        duration: 8,
        description: 'Review task goals, start timer, notify collaborators if needed.',
        type: 'routine',
        visualCues: {
          icon: 'timer',
        },
        transitionCue: {
          type: 'text',
          text: 'Take three deep breaths, name your first action, then press start.',
          isRequired: true,
        },
      },
    ],
    benefits: ['Supports hyperfocus on-ramp', 'Clears distractions', 'Provides reliable start cue'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: 'anchor-evening-unwind',
    name: 'Evening Unwind',
    category: 'Evening Wind Down',
    description: 'Transition out of work mode and prepare for restorative sleep.',
    icon: 'moon',
    tags: ['evening', 'sleep', 'routine'],
    estimatedDuration: 30,
    steps: [
      {
        title: 'Shut Down Ritual',
        duration: 10,
        description: 'Close loops for the day, capture to-dos, set out tomorrow anchors.',
        type: 'routine',
        visualCues: {
          icon: 'inbox',
        },
      },
      {
        title: 'Sensory Soothing',
        duration: 8,
        description: 'Dim lighting, start calming audio, offer weighted blanket if desired.',
        type: 'note',
        visualCues: {
          icon: 'candle',
        },
      },
      {
        title: 'Body Care and Transition',
        duration: 12,
        description: 'Complete hygiene steps, change clothes, set sleep environment.',
        type: 'routine',
        visualCues: {
          icon: 'bath',
        },
      },
    ],
    benefits: ['Signals closure', 'Supports sensory needs', 'Improves sleep latency'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: 'anchor-workday-launchpad',
    name: 'Workday Launchpad',
    category: 'Executive Function',
    description: 'Create a consistent start to collaborative or independent work days.',
    icon: 'chart',
    tags: ['workday', 'team-sync', 'planning'],
    estimatedDuration: 18,
    steps: [
      {
        title: 'Status Snapshot',
        duration: 6,
        description: 'Review inbox, team chat, and urgent notifications in one sweep.',
        type: 'routine',
        visualCues: {
          icon: 'snapshot',
        },
      },
      {
        title: 'Priority Matrix Check',
        duration: 6,
        description: 'Confirm priority matrix placements, flag blockers, pick top impact task.',
        type: 'routine',
        visualCues: {
          icon: 'compass',
        },
      },
      {
        title: 'Energy + Support Scan',
        duration: 6,
        description: 'Note current energy level, request body doubling or accommodation if needed.',
        type: 'note',
        visualCues: {
          icon: 'energy',
        },
      },
    ],
    benefits: ['Reduces start friction', 'Encourages proactive support requests', 'Keeps teams aligned'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: 'anchor-sensory-reset',
    name: 'Sensory Regulation Reset',
    category: 'Regulation Boosts',
    description: 'Short sequence to recalibrate sensory load and nervous system tone.',
    icon: 'reset',
    tags: ['sensory', 'regulation', 'break'],
    estimatedDuration: 15,
    steps: [
      {
        title: 'Body Check and Release',
        duration: 5,
        description: 'Scan through shoulders, jaw, hands. Release tension with shakes or stretches.',
        type: 'routine',
        visualCues: {
          icon: 'stretch',
        },
      },
      {
        title: 'Sensory Choice Menu',
        duration: 5,
        description: 'Pick calming, energizing, or grounding activity from personalized menu.',
        type: 'note',
        visualCues: {
          icon: 'palette',
        },
      },
      {
        title: 'Re-entry Cue',
        duration: 5,
        description: 'Set timer, stretch fingers, and name first action on return.',
        type: 'routine',
        visualCues: {
          icon: 'bell',
        },
      },
    ],
    benefits: ['Supports interoception', 'Offers choice and control', 'Creates predictable re-entry cue'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: 'anchor-body-doubling-ready',
    name: 'Body Doubling Ready Set',
    category: 'Social Support',
    description: 'Prep environment and agreements before joining a body doubling session.',
    icon: 'handshake',
    tags: ['body-doubling', 'prep', 'adhd'],
    estimatedDuration: 12,
    steps: [
      {
        title: 'Session Intent',
        duration: 4,
        description: 'Name today focus, desired accountability, and break plan.',
        type: 'routine',
        visualCues: {
          icon: 'goal',
        },
      },
      {
        title: 'Environment Tune',
        duration: 4,
        description: 'Check camera angle (if on), adjust background, gather materials.',
        type: 'routine',
        visualCues: {
          icon: 'camera',
        },
      },
      {
        title: 'Connection Check',
        duration: 4,
        description: 'Send quick note to partner, confirm shared expectations, start timer.',
        type: 'routine',
        visualCues: {
          icon: 'chat',
        },
      },
    ],
    benefits: ['Reduces coordination friction', 'Sets clear accountability', 'Honors support boundaries'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: 'anchor-medication-orbit',
    name: 'Medication Orbit Starter',
    category: 'Health & Care',
    description: 'Guided cues to prep, take, and log medication without relying on memory.',
    icon: 'pill',
    tags: ['health', 'medication', 'care'],
    estimatedDuration: 12,
    steps: [
      {
        title: 'Prep & Confirm Dose',
        duration: 4,
        description: 'Open the Medication Orbit widget, confirm today’s dose, gather water or snack if needed.',
        type: 'medication',
        visualCues: {
          icon: 'checklist',
        },
        transitionCue: {
          type: 'text',
          text: 'Pause, read instructions, and name the medication out loud.',
          isRequired: true,
        },
      },
      {
        title: 'Take + Regulate',
        duration: 3,
        description: 'Follow provider guidance, use grounding (deep breaths, stretching) before/after swallowing.',
        type: 'medication',
        visualCues: {
          icon: 'breath',
        },
      },
      {
        title: 'Log & Mini-Reflection',
        duration: 3,
        description: 'Tap “Log” so streaks stay accurate, jot any sensations or reminders for clinicians.',
        type: 'note',
        visualCues: {
          icon: 'journal',
        },
      },
      {
        title: 'Set Next Cue',
        duration: 2,
        description: 'Queue the next reminder or transition into the following routine block.',
        type: 'routine',
        visualCues: {
          icon: 'timer',
        },
      },
    ],
    benefits: ['Reduces executive load around dosing', 'Keeps AI insights up to date', 'Encourages reflection for clinicians'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: 'anchor-sensory-nutrition',
    name: 'Sensory Nutrition Boost',
    category: 'Health & Care',
    description: 'Sensory-friendly flow for meals, snacks, or hydration rituals.',
    icon: 'bowl',
    tags: ['nutrition', 'hydration', 'sensory'],
    estimatedDuration: 15,
    steps: [
      {
        title: 'Sensory Menu Check',
        duration: 4,
        description: 'Use the Sensory Nutrition widget to pick textures/temps that feel safe right now.',
        type: 'health',
        visualCues: {
          icon: 'palette',
        },
      },
      {
        title: 'Gather & Prep',
        duration: 6,
        description: 'Assemble ingredients or grab ready-to-eat options, set up low-effort plating.',
        type: 'health',
        visualCues: {
          icon: 'tray',
        },
      },
      {
        title: 'Mindful Bite + Hydration',
        duration: 3,
        description: 'Take a bite or sip, notice energy level, sip water/tea between bites.',
        type: 'health',
        visualCues: {
          icon: 'water',
        },
      },
      {
        title: 'Log & Future You',
        duration: 2,
        description: 'Record mood/energy shift and queue grocery or prep reminders if something worked.',
        type: 'note',
        visualCues: {
          icon: 'sparkle',
        },
      },
    ],
    benefits: ['Provides ready-made sensory-friendly flow', 'Encourages hydration tracking', 'Feeds AI nutrition insights'],
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
];
