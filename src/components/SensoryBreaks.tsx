import React, { useState } from 'react';

interface SensoryExercise {
  id: string;
  name: string;
  category: 'breathing' | 'grounding' | 'movement' | 'sensory' | 'stim';
  duration: number;
  difficulty: 'easy' | 'medium' | 'advanced';
  description: string;
  steps: string[];
  icon: string;
  benefits: string[];
}

const SENSORY_EXERCISES: SensoryExercise[] = [
  {
    id: '5-4-3-2-1',
    name: '5-4-3-2-1 Grounding',
    category: 'grounding',
    duration: 5,
    difficulty: 'easy',
    description: 'Connect with your senses to ground yourself',
    icon: '👁️',
    steps: [
      'Name 5 things you can see',
      'Name 4 things you can touch',
      'Name 3 things you can hear',
      'Name 2 things you can smell',
      'Name 1 thing you can taste',
    ],
    benefits: ['Reduces anxiety', 'Increases presence', 'Calms nervous system'],
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    category: 'breathing',
    duration: 3,
    difficulty: 'easy',
    description: '4-4-4-4 breathing pattern for calm',
    icon: '🌬️',
    steps: [
      'Breathe in for 4 counts',
      'Hold for 4 counts',
      'Breathe out for 4 counts',
      'Hold for 4 counts',
      'Repeat 4-5 times',
    ],
    benefits: ['Calms mind', 'Reduces stress', 'Improves focus'],
  },
  {
    id: 'hand-massage',
    name: 'Hand Massage',
    category: 'sensory',
    duration: 3,
    difficulty: 'easy',
    description: 'Self-massage for sensory regulation',
    icon: '🤲',
    steps: [
      'Press thumb into palm with circular motions',
      'Massage each finger from base to tip',
      'Stretch fingers gently',
      'Press pressure points between fingers',
      'Shake hands gently to release',
    ],
    benefits: ['Proprioceptive input', 'Calming', 'Grounding'],
  },
  {
    id: 'wall-pushes',
    name: 'Wall Pushes',
    category: 'movement',
    duration: 2,
    difficulty: 'easy',
    description: 'Deep pressure proprioceptive input',
    icon: '💪',
    steps: [
      'Stand facing a wall',
      'Place hands flat on wall at shoulder height',
      'Push hard against wall for 10 seconds',
      'Relax for 5 seconds',
      'Repeat 3-5 times',
    ],
    benefits: ['Proprioceptive input', 'Energy release', 'Calming'],
  },
  {
    id: 'fidget-time',
    name: 'Stim Break',
    category: 'stim',
    duration: 5,
    difficulty: 'easy',
    description: 'Intentional stimming for regulation',
    icon: '🎵',
    steps: [
      'Choose a comfortable stim (rocking, hand-flapping, etc.)',
      'Give yourself permission to stim freely',
      'Focus on the sensation and rhythm',
      'Continue until you feel regulated',
      'Take a deep breath when finished',
    ],
    benefits: ['Self-regulation', 'Comfort', 'Sensory processing'],
  },
  {
    id: 'body-scan',
    name: 'Quick Body Scan',
    category: 'grounding',
    duration: 5,
    difficulty: 'medium',
    description: 'Progressive muscle awareness',
    icon: '🧘',
    steps: [
      'Close your eyes and breathe naturally',
      'Notice tension in your face and relax it',
      'Move attention down to shoulders, release tension',
      'Scan through arms, torso, legs',
      'Wiggle toes and slowly open eyes',
    ],
    benefits: ['Body awareness', 'Tension release', 'Mindfulness'],
  },
  {
    id: 'cold-water',
    name: 'Cold Water Splash',
    category: 'sensory',
    duration: 2,
    difficulty: 'easy',
    description: 'Quick sensory reset with cold water',
    icon: '💧',
    steps: [
      'Go to sink with cold running water',
      'Splash cold water on face 3 times',
      'Hold cold water on wrists for 30 seconds',
      'Pat face dry gently',
      'Take 3 deep breaths',
    ],
    benefits: ['Immediate reset', 'Alertness', 'Sensory shift'],
  },
  {
    id: 'progressive-relaxation',
    name: 'Progressive Muscle Relaxation',
    category: 'movement',
    duration: 10,
    difficulty: 'medium',
    description: 'Systematic tension and release',
    icon: '🤸',
    steps: [
      'Tense feet muscles for 5 seconds, then release',
      'Move up to calves, tense and release',
      'Continue through thighs, abdomen, chest',
      'Tense arms, shoulders, neck, face',
      'Feel the difference between tension and relaxation',
    ],
    benefits: ['Deep relaxation', 'Stress relief', 'Body awareness'],
  },
];

export const SensoryBreaks: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeExercise, setActiveExercise] = useState<SensoryExercise | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const categories = [
    { id: 'all', name: 'All', icon: '✨' },
    { id: 'breathing', name: 'Breathing', icon: '🌬️' },
    { id: 'grounding', name: 'Grounding', icon: '👁️' },
    { id: 'movement', name: 'Movement', icon: '🤸' },
    { id: 'sensory', name: 'Sensory', icon: '🤲' },
    { id: 'stim', name: 'Stim-Friendly', icon: '🎵' },
  ];

  const filteredExercises = selectedCategory === 'all'
    ? SENSORY_EXERCISES
    : SENSORY_EXERCISES.filter((e) => e.category === selectedCategory);

  const startExercise = (exercise: SensoryExercise) => {
    setActiveExercise(exercise);
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const nextStep = () => {
    if (activeExercise && currentStep < activeExercise.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeExercise();
    }
  };

  const completeExercise = () => {
    setActiveExercise(null);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  if (activeExercise && isPlaying) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-teal-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50 p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full text-white">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{activeExercise.icon}</div>
            <h2 className="text-3xl font-bold mb-2">{activeExercise.name}</h2>
            <p className="text-blue-200">{activeExercise.description}</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-blue-200">
                Step {currentStep + 1} of {activeExercise.steps.length}
              </span>
              <span className="text-sm text-blue-200">
                ~{activeExercise.duration} minutes
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-6">
              <div
                className="bg-gradient-to-r from-teal-400 to-blue-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / activeExercise.steps.length) * 100}%` }}
              />
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-6 mb-6">
              <p className="text-xl text-center leading-relaxed">
                {activeExercise.steps[currentStep]}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={completeExercise}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Exit
            </button>
            <button
              onClick={nextStep}
              className="px-8 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors font-semibold"
            >
              {currentStep < activeExercise.steps.length - 1 ? 'Next' : 'Complete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Sensory Break Library 🧘
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Quick exercises for sensory regulation and grounding
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              selectedCategory === category.id
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      {/* Exercise Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">{exercise.icon}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {exercise.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {exercise.description}
            </p>

            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-500">
              <span>⏱️ {exercise.duration}min</span>
              <span className="capitalize px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {exercise.difficulty}
              </span>
            </div>

            <div className="mb-4">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Benefits:
              </div>
              <div className="flex flex-wrap gap-1">
                {exercise.benefits.map((benefit, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => startExercise(exercise)}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              Start Exercise
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
