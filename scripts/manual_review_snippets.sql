-- MANUAL REVIEW STATEMENT 6126
END $$;
-- Enhanced Routine Steps Migration for Flex Zones & Transition Support
-- This migration adds comprehensive support for flex zones, transitions, and freeform content

-- Create new enums for enhanced routine functionality
-- Canonical enums block replaced (original preserved in backup)
CREATE TYPE IF NOT EXISTS routine_step_type AS ENUM ('routine', 'flexZone', 'note');
CREATE TYPE IF NOT EXISTS transition_cue_type AS ENUM ('text', 'audio', 'visual', 'mixed');
CREATE TYPE IF NOT EXISTS freeform_data_type AS ENUM ('note', 'sketch');
CREATE TYPE IF NOT EXISTS step_execution_status AS ENUM ('pending', 'active', 'paused', 'completed', 'skipped');
CREATE TYPE IF NOT EXISTS timer_notification_type AS ENUM ('visual', 'audio', 'vibration', 'all');
CREATE TYPE IF NOT EXISTS timer_intensity AS ENUM ('subtle', 'normal', 'prominent');
CREATE TYPE IF NOT EXISTS neurotype_time_awareness AS ENUM ('high', 'medium', 'low');
CREATE TYPE IF NOT EXISTS autism_routine_rigidity AS ENUM ('flexible', 'structured', 'strict');


-- Enhanced Routine Steps Table
CREATE TABLE IF NOT EXISTS routine_steps (
  step_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  step_type routine_step_type NOT NULL DEFAULT 'routine',
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 0, -- minutes
  order_index INTEGER NOT NULL,
  
  -- Transition Support Properties
  transition_cue JSONB, -- TransitionCue object
  
  -- Flex Zone Specific Properties
  freeform_data JSONB, -- FreeformData object
  timer_settings JSONB, -- TimerSettings object
  is_flexible BOOLEAN DEFAULT false,
  
  -- Visual and Accessibility Support
  visual_cues JSONB, -- color, icon, emoji, backgroundColor, borderColor
  
  -- Neurotype Adaptations
  neurotype_adaptations JSONB, -- ADHD, autism, dyslexia specific settings
  
  -- Execution State (runtime)
  execution_state JSONB, -- status, startedAt, completedAt, actualDuration, notes
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Routine Executions Table
CREATE TABLE IF NOT EXISTS routine_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Execution tracking
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  current_step_id UUID REFERENCES routine_steps(step_id),
  total_duration INTEGER, -- actual minutes taken
  
  -- Flexibility tracking
  modifications JSONB DEFAULT '[]', -- RoutineModification array
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step Executions Table
CREATE TABLE IF NOT EXISTS step_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_execution_id UUID NOT NULL REFERENCES routine_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES routine_steps(step_id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  actual_duration INTEGER, -- minutes
  status step_execution_status DEFAULT 'pending',
  
  -- Flex zone specific
  freeform_data_snapshot JSONB, -- Snapshot of freeform content
  timer_overrun INTEGER DEFAULT 0, -- minutes past planned duration
  
  -- User feedback
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interruptions Table
CREATE TABLE IF NOT EXISTS routine_interruptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_execution_id UUID NOT NULL REFERENCES routine_executions(id) ON DELETE CASCADE,
  interruption_type TEXT NOT NULL CHECK (interruption_type IN ('external', 'internal', 'planned')),
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  impact TEXT NOT NULL CHECK (impact IN ('minor', 'moderate', 'major')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routine Templates Table
CREATE TABLE IF NOT EXISTS routine_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('morning', 'evening', 'work', 'self-care', 'exercise', 'custom')),
  estimated_duration INTEGER NOT NULL,
  
  -- Template metadata
  is_public BOOLEAN DEFAULT false,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  neurotype_optimized TEXT[] DEFAULT '{}', -- ['adhd', 'autism', 'dyslexia']
  
  -- Usage statistics
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Steps Table
CREATE TABLE IF NOT EXISTS template_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
  step_type routine_step_type NOT NULL DEFAULT 'routine',
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL,
  
  -- All the same properties as routine_steps but without routine_id
  transition_cue JSONB,
  freeform_data JSONB,
  timer_settings JSONB,
  is_flexible BOOLEAN DEFAULT false,
  visual_cues JSONB,
  neurotype_adaptations JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_routine_steps_routine_id ON routine_steps(routine_id);
CREATE INDEX idx_routine_steps_order ON routine_steps(order_index);
CREATE INDEX idx_routine_steps_type ON routine_steps(step_type);

CREATE INDEX idx_routine_executions_user_id ON routine_executions(user_id);
CREATE INDEX idx_routine_executions_routine_id ON routine_executions(routine_id);
CREATE INDEX idx_routine_executions_started_at ON routine_executions(started_at);

CREATE INDEX idx_step_executions_routine_execution_id ON step_executions(routine_execution_id);
CREATE INDEX idx_step_executions_step_id ON step_executions(step_id);
CREATE INDEX idx_step_executions_status ON step_executions(status);

CREATE INDEX idx_routine_interruptions_routine_execution_id ON routine_interruptions(routine_execution_id);

CREATE INDEX idx_routine_templates_category ON routine_templates(category);
CREATE INDEX idx_routine_templates_public ON routine_templates(is_public);
CREATE INDEX idx_routine_templates_author_id ON routine_templates(author_id);

CREATE INDEX idx_template_steps_template_id ON template_steps(template_id);
CREATE INDEX idx_template_steps_order ON template_steps(order_index);

-- Row Level Security
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_interruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Routine Steps Policies
CREATE POLICY "Users can manage routine steps" ON routine_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM routines 
      WHERE routines.id = routine_steps.routine_id 
      AND routines.user_id = auth.uid()
    )
  );

-- Routine Executions Policies
CREATE POLICY "Users can manage own routine executions" ON routine_executions
  FOR ALL USING (auth.uid() = user_id);

-- Step Executions Policies
CREATE POLICY "Users can manage step executions" ON step_executions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM routine_executions 
      WHERE routine_executions.id = step_executions.routine_execution_id 
      AND routine_executions.user_id = auth.uid()
    )
  );

-- Routine Interruptions Policies
CREATE POLICY "Users can manage routine interruptions" ON routine_interruptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM routine_executions 
      WHERE routine_executions.id = routine_interruptions.routine_execution_id 
      AND routine_executions.user_id = auth.uid()
    )
  );

-- Routine Templates Policies
CREATE POLICY "Users can view public templates" ON routine_templates
  FOR SELECT USING (is_public = true OR author_id = auth.uid());

CREATE POLICY "Users can manage own templates" ON routine_templates
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Users can create templates" ON routine_templates
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Template Steps Policies
CREATE POLICY "Users can view template steps" ON template_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routine_templates 
      WHERE routine_templates.id = template_steps.template_id 
      AND (routine_templates.is_public = true OR routine_templates.author_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own template steps" ON template_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM routine_templates 
      WHERE routine_templates.id = template_steps.template_id 
      AND routine_templates.author_id = auth.uid()
    )
  );

-- Update triggers for updated_at
CREATE TRIGGER update_routine_steps_updated_at 
  BEFORE UPDATE ON routine_steps 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_executions_updated_at 
  BEFORE UPDATE ON routine_executions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_templates_updated_at 
  BEFORE UPDATE ON routine_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper functions

-- Function to calculate total routine duration
CREATE OR REPLACE FUNCTION calculate_routine_duration(routine_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  total_duration INTEGER := 0;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6127
BEGIN
  SELECT COALESCE(SUM(duration), 0) INTO total_duration
  FROM routine_steps
  WHERE routine_id = routine_id_param;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6128
RETURN total_duration;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6130
$$ LANGUAGE plpgsql;

-- Function to get next step order index
CREATE OR REPLACE FUNCTION get_next_step_order(routine_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  next_order INTEGER := 1;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6131
BEGIN
  SELECT COALESCE(MAX(order_index), 0) + 1 INTO next_order
  FROM routine_steps
  WHERE routine_id = routine_id_param;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6132
RETURN next_order;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6134
$$ LANGUAGE plpgsql;

-- Function to reorder steps after deletion
CREATE OR REPLACE FUNCTION reorder_routine_steps()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE routine_steps 
  SET order_index = order_index - 1
  WHERE routine_id = OLD.routine_id 
  AND order_index > OLD.order_index;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6135
RETURN OLD;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6137
RETURN NEW;


-- END SNIPPET

-- MANUAL REVIEW STATEMENT 6138
$$ LANGUAGE plpgsql;

-- Trigger to maintain step order
CREATE TRIGGER reorder_steps_after_delete
  AFTER DELETE ON routine_steps
  FOR EACH ROW
  EXECUTE FUNCTION reorder_routine_steps();

-- Function to validate routine step constraints
CREATE OR REPLACE FUNCTION validate_routine_constraints()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent consecutive flex zones (business rule example)
  IF NEW.step_type = 'flexZone' THEN
    -- Check if previous step is also a flex zone
    IF EXISTS (
      SELECT 1 FROM routine_steps 
      WHERE routine_id = NEW.routine_id 
      AND order_index = NEW.order_index - 1 
      AND step_type = 'flexZone'
    ) THEN
      RAISE EXCEPTION 'Cannot have consecutive flex zones in routine';


-- END SNIPPET

