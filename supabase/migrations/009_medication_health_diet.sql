-- Medication & Health + Diet schema additions
begin;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'routine_step_type') then
    null;
  end if;
  if not exists (select 1 from pg_type where typname = 'medication_intake_context') then
    create type medication_intake_context as enum ('morning', 'midday', 'evening', 'bedtime', 'custom');
  end if;

  if not exists (select 1 from pg_type where typname = 'treatment_channel') then
    create type treatment_channel as enum ('therapy', 'occupational', 'pt', 'coaching', 'medical');
  end if;

  if not exists (select 1 from pg_type where typname = 'nutrition_entry_type') then
    create type nutrition_entry_type as enum ('meal', 'snack', 'drink', 'supplement');
  end if;
end $$;

alter type routine_step_type add value if not exists 'medication';
alter type routine_step_type add value if not exists 'health';

alter table if exists routine_steps
  add column if not exists extensions jsonb;

-- Medication plans
create table if not exists medication_regimens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  name text not null,
  description text,
  provider_name text,
  color_token text,
  sensory_considerations text,
  adherence_goal integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists medication_doses (
  id uuid primary key default uuid_generate_v4(),
  regimen_id uuid not null references medication_regimens(id) on delete cascade,
  routine_step_id uuid references routine_steps(step_id) on delete set null,
  label text not null,
  dosage text not null,
  instructions text,
  requires_food boolean default false,
  intake_window medication_intake_context default 'morning',
  scheduled_time time,
  prn boolean default false,
  reminders jsonb default '{}'::jsonb,
  side_effect_watchlist text[],
  last_taken_at timestamptz,
  streak integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Treatment tracking
create table if not exists treatment_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  routine_id uuid references routines(id) on delete set null,
  channel treatment_channel not null,
  focus_areas text[],
  provider text,
  cadence text,
  meeting_link text,
  prep_template jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists treatment_check_ins (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references treatment_sessions(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  mood_before integer,
  mood_after integer,
  energy_before integer,
  energy_after integer,
  highlights jsonb,
  blockers jsonb,
  homework jsonb,
  ai_summary text,
  created_at timestamptz default now()
);

-- Health & diet journaling
create table if not exists health_nutrition_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  entry_type nutrition_entry_type not null,
  title text not null,
  description text,
  occurred_at timestamptz not null default now(),
  sensory_profile jsonb,
  energy_before integer,
  energy_after integer,
  mood_shift integer,
  hydration_score integer,
  tags text[],
  ai_recommendation jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists health_insight_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  adherence jsonb,
  correlations jsonb,
  next_actions jsonb,
  generated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_medication_regimens_user on medication_regimens(user_id);
create index if not exists idx_medication_doses_regimen on medication_doses(regimen_id);
create index if not exists idx_medication_doses_routine_step on medication_doses(routine_step_id);

create index if not exists idx_treatment_sessions_user on treatment_sessions(user_id);
create index if not exists idx_treatment_sessions_routine on treatment_sessions(routine_id);
create index if not exists idx_treatment_checkins_session on treatment_check_ins(session_id);

create index if not exists idx_health_entries_user on health_nutrition_entries(user_id);
create index if not exists idx_health_entries_type on health_nutrition_entries(entry_type);
create index if not exists idx_health_insights_user on health_insight_snapshots(user_id);

-- RLS
alter table if exists medication_regimens enable row level security;
alter table if exists medication_doses enable row level security;
alter table if exists treatment_sessions enable row level security;
alter table if exists treatment_check_ins enable row level security;
alter table if exists health_nutrition_entries enable row level security;
alter table if exists health_insight_snapshots enable row level security;

drop policy if exists "Users manage medication regimens" on medication_regimens;
create policy "Users manage medication regimens" on medication_regimens
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage medication doses" on medication_doses;
create policy "Users manage medication doses" on medication_doses
  for all using (
    exists (
      select 1 from medication_regimens
      where medication_regimens.id = medication_doses.regimen_id
      and medication_regimens.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage treatment sessions" on treatment_sessions;
create policy "Users manage treatment sessions" on treatment_sessions
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage treatment check-ins" on treatment_check_ins;
create policy "Users manage treatment check-ins" on treatment_check_ins
  for all using (
    exists (
      select 1 from treatment_sessions
      where treatment_sessions.id = treatment_check_ins.session_id
      and treatment_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage health entries" on health_nutrition_entries;
create policy "Users manage health entries" on health_nutrition_entries
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage health insights" on health_insight_snapshots;
create policy "Users manage health insights" on health_insight_snapshots
  for all using (auth.uid() = user_id);

-- Update triggers
create trigger update_medication_regimens_updated_at
  before update on medication_regimens
  for each row execute function update_updated_at_column();

create trigger update_medication_doses_updated_at
  before update on medication_doses
  for each row execute function update_updated_at_column();

create trigger update_treatment_sessions_updated_at
  before update on treatment_sessions
  for each row execute function update_updated_at_column();

create trigger update_health_entries_updated_at
  before update on health_nutrition_entries
  for each row execute function update_updated_at_column();

commit;
