-- Universal Neurotype Planner Database Schema
-- This file contains the complete database schema for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
CREATE TYPE neurotype AS ENUM (
  'adhd', 'autism', 'executive-function', 'anxiety', 'depression', 
  'learning-difference', 'neurotypical', 'multiple', 'exploring'
);

CREATE TYPE age_group AS ENUM ('child', 'teen', 'young-adult', 'adult', 'senior');

CREATE TYPE task_category AS ENUM (
  'work', 'personal', 'health', 'social', 'creative', 
  'learning', 'maintenance', 'self-care'
);

CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE task_status AS ENUM (
  'not-started', 'in-progress', 'blocked', 'completed', 'cancelled', 'deferred'
);

CREATE TYPE energy_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE focus_level AS ENUM ('low', 'medium', 'high', 'deep');

CREATE TYPE routine_type AS ENUM (
  'morning', 'evening', 'workday', 'weekend', 'transition', 'crisis', 'custom'
);

CREATE TYPE flexibility_level AS ENUM ('rigid', 'structured', 'flexible', 'adaptive');

CREATE TYPE insight_type AS ENUM (
  'pattern-recognition', 'optimization', 'warning', 'celebration', 'adaptation', 'coaching'
);

CREATE TYPE suggestion_type AS ENUM (
  'routine-adjustment', 'task-optimization', 'schedule-change', 
  'break-suggestion', 'environment-modification', 'tool-recommendation'
);

CREATE TYPE notification_type AS ENUM (
  'reminder', 'celebration', 'suggestion', 'warning', 'update', 'social'
);

CREATE TYPE event_type AS ENUM (
  'task-completed', 'routine-started', 'mood-logged', 'insight-generated',
  'goal-achieved', 'milestone-reached', 'pattern-detected', 'disruption-occurred'
);

CREATE TYPE event_source AS ENUM ('user-action', 'system', 'ai', 'timer', 'external');

-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL,
  neurotype neurotype NOT NULL,
  age_group age_group NOT NULL,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings Table (Onboarding-focused)
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_status TEXT NOT NULL DEFAULT 'PENDING',
  neurotype TEXT,
  age_group TEXT,
  theme TEXT,
  font_size TEXT,
  dyslexia_font_enabled BOOLEAN DEFAULT FALSE,
  primary_color_palette TEXT,
  language_preference TEXT,
  CONSTRAINT valid_onboarding_status CHECK (onboarding_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETE')),
  CONSTRAINT valid_neurotype CHECK (neurotype IN ('ADHD', 'ASD', 'DYSLEXIA', 'AUDHD', 'NEUROTYPICAL', 'CUSTOM', NULL)),
  CONSTRAINT valid_age_group CHECK (age_group IN ('TEEN', 'ADULT', NULL)),
  CONSTRAINT valid_theme CHECK (theme IN ('LIGHT', 'DARK', 'HIGH_CONTRAST', NULL)),
  CONSTRAINT valid_font_size CHECK (font_size IN ('SMALL', 'MEDIUM', 'LARGE', NULL))
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category task_category NOT NULL,
  priority priority DEFAULT 'medium',
  estimated_duration INTEGER NOT NULL, -- minutes
  actual_duration INTEGER,
  buffer_time INTEGER DEFAULT 0,
  status task_status DEFAULT 'not-started',
  due_date TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  energy_required energy_level DEFAULT 'medium',
  focus_required focus_level DEFAULT 'medium',
  sensory_considerations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines Table
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type routine_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  flexibility flexibility_level DEFAULT 'flexible',
  schedule JSONB NOT NULL, -- frequency, days, times, etc.
  adaptive_rules JSONB DEFAULT '[]',
  visual_board JSONB, -- board configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routine Tasks Junction Table
CREATE TABLE routine_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  estimated_duration INTEGER NOT NULL,
  buffer_time INTEGER DEFAULT 0,
  conditions JSONB, -- conditional execution rules
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, task_id)
);

-- Mood Entries Table
CREATE TABLE mood_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 10),
  energy INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 10),
  focus INTEGER NOT NULL CHECK (focus >= 1 AND focus <= 10),
  anxiety INTEGER NOT NULL CHECK (anxiety >= 1 AND anxiety <= 10),
  stress INTEGER NOT NULL CHECK (stress >= 1 AND stress <= 10),
  motivation INTEGER NOT NULL CHECK (motivation >= 1 AND motivation <= 10),
  notes TEXT,
  triggers TEXT[],
  context JSONB, -- location, weather, sleep, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Insights Table
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type insight_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  relevance DECIMAL(3,2) CHECK (relevance >= 0 AND relevance <= 1),
  actionable BOOLEAN DEFAULT false,
  suggestions JSONB DEFAULT '[]',
  data JSONB DEFAULT '{}', -- raw analysis data
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ
);

-- Shared Boards Table (for collaboration)
CREATE TABLE shared_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL, -- references routine or custom board
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  shared_with JSONB NOT NULL, -- array of access objects
  permissions JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  priority priority DEFAULT 'medium',
  actionable BOOLEAN DEFAULT false,
  actions JSONB, -- available actions
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Events Table (for analytics and AI training)
CREATE TABLE app_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  type event_type NOT NULL,
  source event_source NOT NULL,
  data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Quick Captures Table (for AI recall feature)
CREATE TABLE quick_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('voice_note', 'photo', 'free_write', 'sketch')),
  title TEXT,
  content TEXT,
  file_url TEXT, -- for photos/audio files
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity Tracking (for AI recall)
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('task_work', 'routine_execution', 'quick_capture', 'dashboard_view')),
  entity_id UUID, -- references task, routine, or capture
  entity_type TEXT CHECK (entity_type IN ('task', 'routine', 'quick_capture')),
  duration_minutes INTEGER,
  context JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_category ON tasks(category);

CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_type ON routines(type);
CREATE INDEX idx_routines_active ON routines(is_active);

CREATE INDEX idx_routine_tasks_routine_id ON routine_tasks(routine_id);
CREATE INDEX idx_routine_tasks_order ON routine_tasks(order_index);

CREATE INDEX idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX idx_mood_entries_timestamp ON mood_entries(timestamp);

CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(type);
CREATE INDEX idx_ai_insights_dismissed ON ai_insights(dismissed_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_delivered ON notifications(delivered_at);
CREATE INDEX idx_notifications_read ON notifications(read_at);

CREATE INDEX idx_app_events_user_id ON app_events(user_id);
CREATE INDEX idx_app_events_type ON app_events(type);
CREATE INDEX idx_app_events_timestamp ON app_events(timestamp);

-- Row Level Security Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User Settings Policies
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Quick Captures Policies
CREATE POLICY "Users can manage own captures" ON quick_captures
  FOR ALL USING (auth.uid() = user_id);

-- User Activity Policies
CREATE POLICY "Users can manage own activity" ON user_activity
  FOR ALL USING (auth.uid() = user_id);

-- Tasks Policies
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Routines Policies
CREATE POLICY "Users can manage own routines" ON routines
  FOR ALL USING (auth.uid() = user_id);

-- Routine Tasks Policies
CREATE POLICY "Users can manage routine tasks" ON routine_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM routines 
      WHERE routines.id = routine_tasks.routine_id 
      AND routines.user_id = auth.uid()
    )
  );

-- Mood Entries Policies
CREATE POLICY "Users can manage own mood entries" ON mood_entries
  FOR ALL USING (auth.uid() = user_id);

-- AI Insights Policies
CREATE POLICY "Users can view own insights" ON ai_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert insights" ON ai_insights
  FOR INSERT WITH CHECK (true); -- Allow system to insert, will be filtered by user_id

CREATE POLICY "Users can update own insights" ON ai_insights
  FOR UPDATE USING (auth.uid() = user_id);

-- Shared Boards Policies
CREATE POLICY "Users can manage own shared boards" ON shared_boards
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can view shared boards" ON shared_boards
  FOR SELECT USING (
    auth.uid() = owner_id OR
    (shared_with ? auth.uid()::text) OR
    is_public = true
  );

-- Notifications Policies
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- App Events Policies
CREATE POLICY "Users can view own events" ON app_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert events" ON app_events
  FOR INSERT WITH CHECK (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routines_updated_at 
  BEFORE UPDATE ON routines 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name, neurotype, age_group)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'neurotype', 'exploring')::neurotype,
    COALESCE(NEW.raw_user_meta_data->>'age_group', 'adult')::age_group
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();