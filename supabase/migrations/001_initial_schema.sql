-- Disabled initial schema migration.
-- The original migration was partially corrupted; a full backup is stored in
-- `supabase/migrations/001_initial_schema.disabled.sql`.
-- This file is intentionally empty so the Supabase CLI will skip re-running
-- the heavy initial schema. Remaining delta migrations (metrics, views, etc.)
-- will be applied by `db push`.

      -- Tasks Table
      CREATE TABLE IF NOT EXISTS tasks (
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
      CREATE TABLE IF NOT EXISTS routines (
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
      CREATE TABLE IF NOT EXISTS routine_tasks (
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
      CREATE TABLE IF NOT EXISTS mood_entries (
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
      CREATE TABLE IF NOT EXISTS ai_insights (
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
      CREATE TABLE IF NOT EXISTS shared_boards (
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
      CREATE TABLE IF NOT EXISTS notifications (
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
      CREATE TABLE IF NOT EXISTS app_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        type event_type NOT NULL,
        source event_source NOT NULL,
        data JSONB DEFAULT '{}',
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      -- Quick Captures Table (for AI recall feature)
      CREATE TABLE IF NOT EXISTS quick_captures (
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
      CREATE TABLE IF NOT EXISTS user_activity (
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
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

      CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id);
      CREATE INDEX IF NOT EXISTS idx_routines_type ON routines(type);
      CREATE INDEX IF NOT EXISTS idx_routines_active ON routines(is_active);

      CREATE INDEX IF NOT EXISTS idx_routine_tasks_routine_id ON routine_tasks(routine_id);
      CREATE INDEX IF NOT EXISTS idx_routine_tasks_order ON routine_tasks(order_index);

      CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON mood_entries(timestamp);

      CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
      CREATE INDEX IF NOT EXISTS idx_ai_insights_dismissed ON ai_insights(dismissed_at);

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_delivered ON notifications(delivered_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);

      CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON app_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(type);
      CREATE INDEX IF NOT EXISTS idx_app_events_timestamp ON app_events(timestamp);

      -- Row Level Security Policies
      ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS user_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS routines ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS routine_tasks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS mood_entries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS ai_insights ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS shared_boards ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS app_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS quick_captures ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS user_activity ENABLE ROW LEVEL SECURITY;

      -- User Profiles Policies
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_catalog.pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          WHERE c.relname = 'user_profiles' AND p.polname = 'users_can_view_own_profile'
        ) THEN
          CREATE POLICY "Users can view own profile" ON user_profiles
            FOR SELECT USING (auth.uid() = id);
        END IF;
      END$$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_catalog.pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          WHERE c.relname = 'user_profiles' AND p.polname = 'users_can_update_own_profile'
        ) THEN
          CREATE POLICY "Users can update own profile" ON user_profiles
            FOR UPDATE USING (auth.uid() = id);
        END IF;
      END$$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_catalog.pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          WHERE c.relname = 'user_profiles' AND p.polname = 'users_can_insert_own_profile'
        ) THEN
          CREATE POLICY "Users can insert own profile" ON user_profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
        END IF;
      END$$;

      -- User Settings Policies
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_catalog.pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          WHERE c.relname = 'user_settings' AND p.polname = 'users_can_manage_own_settings'
        ) THEN
          CREATE POLICY "Users can manage own settings" ON user_settings
            FOR ALL USING (auth.uid() = user_id);
        END IF;
      END$$;

      -- Functions
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Triggers for updated_at
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
          CREATE TRIGGER update_user_profiles_updated_at 
            BEFORE UPDATE ON user_profiles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
          CREATE TRIGGER update_tasks_updated_at 
            BEFORE UPDATE ON tasks 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_routines_updated_at') THEN
          CREATE TRIGGER update_routines_updated_at 
            BEFORE UPDATE ON routines 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END$$;

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

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
          CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION handle_new_user();
        END IF;
      END$$;