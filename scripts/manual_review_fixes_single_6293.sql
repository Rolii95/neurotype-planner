-- Single-block run: 6293
-- PROPOSED FIX: Reassembled function for failing statement 6293

DO $guard$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autism_routine_rigidity') THEN
		EXECUTE $exec$CREATE TYPE autism_routine_rigidity AS ENUM ('flexible', 'structured', 'strict');$exec$;
	END IF;

	-- Enhanced Routine Steps Table
	EXECUTE $exec$
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
	$exec$;
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
-- Indexes for performance (created via EXECUTE inside the DO block)
EXECUTE $exec$CREATE INDEX IF NOT EXISTS idx_routine_steps_routine_id ON routine_steps(routine_id);$exec$;
EXECUTE $exec$CREATE INDEX IF NOT EXISTS idx_routine_steps_order ON routine_steps(order_index);$exec$;
EXECUTE $exec$CREATE INDEX IF NOT EXISTS idx_routine_steps_type ON routine_steps(step_type);$exec$;
EXECUTE $exec$CREATE INDEX IF NOT EXISTS idx_routine_executions_user_id ON routine_executions(user_id);$exec$;

END $guard$ LANGUAGE plpgsql;

