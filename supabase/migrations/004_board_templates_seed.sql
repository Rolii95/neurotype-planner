-- Board Templates Seed Data
-- Run this after the main board schema migration

-- Morning Routine (Beginner)
INSERT INTO board_templates (
  name,
  description,
  category,
  difficulty,
  template_data,
  neurotype_optimized,
  is_public,
  estimated_duration,
  tags
) VALUES (
  'Morning Routine - Simple',
  'A gentle morning routine to start your day with clarity and energy',
  'morning',
  'beginner',
  jsonb_build_object(
    'board', jsonb_build_object(
      'board_type', 'routine',
      'layout', 'linear',
      'config', jsonb_build_object(
        'showProgress', true,
        'showTimers', true,
        'highlightTransitions', true,
        'allowReordering', false,
        'autoSave', true,
        'pauseBetweenSteps', 30
      ),
      'visual_settings', jsonb_build_object(
        'backgroundColor', '#FFF5E6',
        'cardStyle', 'modern',
        'iconSet', 'default',
        'fontSize', 'medium',
        'spacing', 'normal'
      )
    ),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Wake Up & Stretch',
        'description', 'Gentle stretching to wake up your body',
        'duration', 5,
        'order_index', 0,
        'visual_cues', jsonb_build_object('color', '#FFA500', 'icon', '🌅'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 60,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Hydrate',
        'description', 'Drink a glass of water to rehydrate',
        'duration', 2,
        'order_index', 1,
        'visual_cues', jsonb_build_object('color', '#4A90E2', 'icon', '💧'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 30,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'visual', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Morning Hygiene',
        'description', 'Brush teeth, wash face, get ready',
        'duration', 10,
        'order_index', 2,
        'visual_cues', jsonb_build_object('color', '#50E3C2', 'icon', '🚿'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 120,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Breakfast',
        'description', 'Eat a healthy breakfast',
        'duration', 15,
        'order_index', 3,
        'visual_cues', jsonb_build_object('color', '#F5A623', 'icon', '🍳'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 180,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Plan Your Day',
        'description', 'Review tasks and set intentions',
        'duration', 5,
        'order_index', 4,
        'visual_cues', jsonb_build_object('color', '#9013FE', 'icon', '📝'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 60,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'all', 'intensity', 'prominent')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      )
    )
  ),
  ARRAY['adhd', 'autism', 'executive-function'],
  true,
  37,
  ARRAY['morning', 'routine', 'simple', 'beginner']
);

-- Evening Wind Down (Beginner)
INSERT INTO board_templates (
  name,
  description,
  category,
  difficulty,
  template_data,
  neurotype_optimized,
  is_public,
  estimated_duration,
  tags
) VALUES (
  'Evening Wind Down',
  'A calming evening routine to prepare for restful sleep',
  'evening',
  'beginner',
  jsonb_build_object(
    'board', jsonb_build_object(
      'board_type', 'routine',
      'layout', 'linear',
      'config', jsonb_build_object(
        'showProgress', true,
        'showTimers', true,
        'highlightTransitions', true,
        'allowReordering', false,
        'autoSave', true,
        'pauseBetweenSteps', 0
      ),
      'visual_settings', jsonb_build_object(
        'backgroundColor', '#2C3E50',
        'cardStyle', 'modern',
        'iconSet', 'default',
        'fontSize', 'medium',
        'spacing', 'spacious'
      )
    ),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Tidy Up',
        'description', 'Quick 10-minute cleanup of main spaces',
        'duration', 10,
        'order_index', 0,
        'visual_cues', jsonb_build_object('color', '#8B5CF6', 'icon', '🧹'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 120,
          'allowOverrun', false,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', true,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Evening Hygiene',
        'description', 'Brush teeth, skincare routine',
        'duration', 8,
        'order_index', 1,
        'visual_cues', jsonb_build_object('color', '#60A5FA', 'icon', '🪥'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 120,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Prepare Tomorrow',
        'description', 'Lay out clothes, pack bag, check calendar',
        'duration', 5,
        'order_index', 2,
        'visual_cues', jsonb_build_object('color', '#EC4899', 'icon', '👕'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 60,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'visual', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'break',
        'title', 'Calm Activity',
        'description', 'Read, journal, or meditate',
        'duration', 15,
        'order_index', 3,
        'visual_cues', jsonb_build_object('color', '#A78BFA', 'icon', '📖'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 180,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'all', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Bedtime',
        'description', 'Get into bed, lights off',
        'duration', 2,
        'order_index', 4,
        'visual_cues', jsonb_build_object('color', '#1E293B', 'icon', '🌙'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 30,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'visual', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      )
    )
  ),
  ARRAY['adhd', 'autism', 'executive-function'],
  true,
  40,
  ARRAY['evening', 'routine', 'sleep', 'wind-down']
);

-- Pomodoro Work Session (Intermediate)
INSERT INTO board_templates (
  name,
  description,
  category,
  difficulty,
  template_data,
  neurotype_optimized,
  is_public,
  estimated_duration,
  tags
) VALUES (
  'Pomodoro Work Session',
  'Classic 25-5 Pomodoro technique for focused work',
  'work',
  'intermediate',
  jsonb_build_object(
    'board', jsonb_build_object(
      'board_type', 'kanban',
      'layout', 'linear',
      'config', jsonb_build_object(
        'showProgress', true,
        'showTimers', true,
        'highlightTransitions', false,
        'allowReordering', false,
        'autoSave', true,
        'pauseBetweenSteps', 0
      ),
      'visual_settings', jsonb_build_object(
        'backgroundColor', '#FFFFFF',
        'cardStyle', 'minimal',
        'iconSet', 'professional',
        'fontSize', 'medium',
        'spacing', 'normal'
      )
    ),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Focus Work',
        'description', 'Deep work - no distractions',
        'duration', 25,
        'order_index', 0,
        'visual_cues', jsonb_build_object('color', '#EF4444', 'icon', '🎯'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 300,
          'allowOverrun', false,
          'endNotification', jsonb_build_object('type', 'all', 'intensity', 'prominent')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'break',
        'title', 'Short Break',
        'description', 'Stand, stretch, hydrate',
        'duration', 5,
        'order_index', 1,
        'visual_cues', jsonb_build_object('color', '#10B981', 'icon', '☕'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 60,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Focus Work',
        'description', 'Continue deep work',
        'duration', 25,
        'order_index', 2,
        'visual_cues', jsonb_build_object('color', '#EF4444', 'icon', '🎯'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 300,
          'allowOverrun', false,
          'endNotification', jsonb_build_object('type', 'all', 'intensity', 'prominent')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'break',
        'title', 'Long Break',
        'description', 'Walk around, get fresh air',
        'duration', 15,
        'order_index', 3,
        'visual_cues', jsonb_build_object('color', '#06B6D4', 'icon', '🚶'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 180,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      )
    )
  ),
  ARRAY['adhd', 'executive-function'],
  true,
  70,
  ARRAY['work', 'focus', 'pomodoro', 'productivity']
);

-- Quick Exercise Routine (Beginner)
INSERT INTO board_templates (
  name,
  description,
  category,
  difficulty,
  template_data,
  neurotype_optimized,
  is_public,
  estimated_duration,
  tags
) VALUES (
  'Quick Exercise Break',
  '15-minute energizing movement routine',
  'exercise',
  'beginner',
  jsonb_build_object(
    'board', jsonb_build_object(
      'board_type', 'routine',
      'layout', 'grid',
      'config', jsonb_build_object(
        'showProgress', true,
        'showTimers', true,
        'highlightTransitions', true,
        'allowReordering', true,
        'autoSave', true,
        'pauseBetweenSteps', 10
      ),
      'visual_settings', jsonb_build_object(
        'backgroundColor', '#ECFDF5',
        'cardStyle', 'colorful',
        'iconSet', 'playful',
        'fontSize', 'large',
        'spacing', 'spacious'
      )
    ),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Warm Up',
        'description', 'Light cardio to get blood flowing',
        'duration', 3,
        'order_index', 0,
        'visual_cues', jsonb_build_object('color', '#F59E0B', 'icon', '🏃'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 30,
          'allowOverrun', false,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Stretches',
        'description', 'Full body stretching',
        'duration', 5,
        'order_index', 1,
        'visual_cues', jsonb_build_object('color', '#8B5CF6', 'icon', '🧘'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 60,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Strength Exercises',
        'description', 'Bodyweight exercises (push-ups, squats)',
        'duration', 5,
        'order_index', 2,
        'visual_cues', jsonb_build_object('color', '#EF4444', 'icon', '💪'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 60,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Cool Down',
        'description', 'Light stretching and deep breathing',
        'duration', 2,
        'order_index', 3,
        'visual_cues', jsonb_build_object('color', '#06B6D4', 'icon', '🌬️'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 30,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'visual', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      )
    )
  ),
  ARRAY['adhd', 'sensory-regulation'],
  true,
  15,
  ARRAY['exercise', 'movement', 'energy', 'quick']
);

-- Self-Care Hour (Beginner)
INSERT INTO board_templates (
  name,
  description,
  category,
  difficulty,
  template_data,
  neurotype_optimized,
  is_public,
  estimated_duration,
  tags
) VALUES (
  'Self-Care Hour',
  'Dedicated time for rest and restoration',
  'self-care',
  'beginner',
  jsonb_build_object(
    'board', jsonb_build_object(
      'board_type', 'freeform',
      'layout', 'freeform',
      'config', jsonb_build_object(
        'showProgress', true,
        'showTimers', false,
        'highlightTransitions', true,
        'allowReordering', true,
        'autoSave', true,
        'pauseBetweenSteps', 0
      ),
      'visual_settings', jsonb_build_object(
        'backgroundColor', '#FFF1F2',
        'cardStyle', 'modern',
        'iconSet', 'playful',
        'fontSize', 'medium',
        'spacing', 'spacious'
      )
    ),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step_type', 'flexZone',
        'title', 'Choose Your Activity',
        'description', 'Pick what feels right: bath, music, art, nature walk',
        'duration', 30,
        'order_index', 0,
        'visual_cues', jsonb_build_object('color', '#EC4899', 'icon', '💝'),
        'timer_settings', jsonb_build_object(
          'autoStart', false,
          'showWarningAt', 300,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'visual', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Hydrate & Snack',
        'description', 'Nourish your body',
        'duration', 10,
        'order_index', 1,
        'visual_cues', jsonb_build_object('color', '#F59E0B', 'icon', '🍎'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 120,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', true,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Reflection',
        'description', 'Journal or meditate on your feelings',
        'duration', 15,
        'order_index', 2,
        'visual_cues', jsonb_build_object('color', '#8B5CF6', 'icon', '🧘'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 180,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'visual', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Gratitude',
        'description', 'List 3 things you''re grateful for',
        'duration', 5,
        'order_index', 3,
        'visual_cues', jsonb_build_object('color', '#10B981', 'icon', '✨'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 60,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', true,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      )
    )
  ),
  ARRAY['autism', 'burnout-prevention', 'sensory-regulation'],
  true,
  60,
  ARRAY['self-care', 'wellness', 'rest', 'restoration']
);

-- Study Session (Intermediate)
INSERT INTO board_templates (
  name,
  description,
  category,
  difficulty,
  template_data,
  neurotype_optimized,
  is_public,
  estimated_duration,
  tags
) VALUES (
  'Effective Study Session',
  'Structured study routine with breaks',
  'study',
  'intermediate',
  jsonb_build_object(
    'board', jsonb_build_object(
      'board_type', 'kanban',
      'layout', 'linear',
      'config', jsonb_build_object(
        'showProgress', true,
        'showTimers', true,
        'highlightTransitions', true,
        'allowReordering', false,
        'autoSave', true,
        'pauseBetweenSteps', 0
      ),
      'visual_settings', jsonb_build_object(
        'backgroundColor', '#EFF6FF',
        'cardStyle', 'modern',
        'iconSet', 'professional',
        'fontSize', 'medium',
        'spacing', 'normal'
      )
    ),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Review Notes',
        'description', 'Quick review of previous material',
        'duration', 10,
        'order_index', 0,
        'visual_cues', jsonb_build_object('color', '#3B82F6', 'icon', '📚'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 120,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Active Learning',
        'description', 'Read, take notes, solve problems',
        'duration', 30,
        'order_index', 1,
        'visual_cues', jsonb_build_object('color', '#8B5CF6', 'icon', '✍️'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 300,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'break',
        'title', 'Break',
        'description', 'Rest your brain',
        'duration', 10,
        'order_index', 2,
        'visual_cues', jsonb_build_object('color', '#10B981', 'icon', '☕'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 120,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'audio', 'intensity', 'subtle')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', true,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      ),
      jsonb_build_object(
        'step_type', 'task',
        'title', 'Practice & Review',
        'description', 'Test yourself, review key concepts',
        'duration', 20,
        'order_index', 3,
        'visual_cues', jsonb_build_object('color', '#F59E0B', 'icon', '🎯'),
        'timer_settings', jsonb_build_object(
          'autoStart', true,
          'showWarningAt', 240,
          'allowOverrun', true,
          'endNotification', jsonb_build_object('type', 'all', 'intensity', 'normal')
        ),
        'neurotype_adaptations', jsonb_build_object(),
        'is_flexible', false,
        'is_optional', false,
        'is_completed', false,
        'execution_state', jsonb_build_object('status', 'pending')
      )
    )
  ),
  ARRAY['adhd', 'executive-function'],
  true,
  70,
  ARRAY['study', 'learning', 'focus', 'education']
);

-- Blank Custom Template (All Levels)
INSERT INTO board_templates (
  name,
  description,
  category,
  difficulty,
  template_data,
  neurotype_optimized,
  is_public,
  estimated_duration,
  tags
) VALUES (
  'Blank Canvas',
  'Start from scratch - build your perfect board',
  'custom',
  'beginner',
  jsonb_build_object(
    'board', jsonb_build_object(
      'board_type', 'custom',
      'layout', 'freeform',
      'config', jsonb_build_object(
        'showProgress', true,
        'showTimers', true,
        'highlightTransitions', true,
        'allowReordering', true,
        'autoSave', true,
        'pauseBetweenSteps', 0
      ),
      'visual_settings', jsonb_build_object(
        'backgroundColor', '#FFFFFF',
        'cardStyle', 'modern',
        'iconSet', 'default',
        'fontSize', 'medium',
        'spacing', 'normal'
      )
    ),
    'steps', jsonb_build_array()
  ),
  ARRAY['adhd', 'autism', 'executive-function'],
  true,
  0,
  ARRAY['custom', 'blank', 'flexible']
);
