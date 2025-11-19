# Universal Neurotype Planner - Supabase Setup

## Database Configuration

This project uses Supabase for backend services including:
- PostgreSQL database with real-time subscriptions
- Authentication with Row Level Security (RLS)
- Real-time data synchronization
- File storage for attachments

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be ready
4. Note your project URL and anon key

### 2. Environment Configuration

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Migration

Run the initial migration to set up all tables:

```sql
-- Run the contents of supabase/migrations/001_initial_schema.sql
-- in your Supabase SQL editor
```

### 4. Row Level Security

The migration includes RLS policies that ensure:
- Users can only access their own data
- Proper isolation between user accounts
- Secure sharing when boards are shared
- System access for AI insights generation

## Database Schema

### Core Tables

- **user_profiles**: User information and preferences
- **tasks**: Individual tasks with neurotype-specific metadata
- **routines**: Daily/weekly routines and habits
- **routine_tasks**: Tasks within routines
- **mood_entries**: Mood and energy tracking data
- **ai_insights**: AI-generated suggestions and patterns
- **shared_boards**: Collaboration and sharing
- **notifications**: System and user notifications
- **app_events**: Analytics and usage tracking

### Features

- **Real-time Updates**: Changes sync instantly across devices
- **Offline Support**: PWA caching for offline functionality
- **Data Export**: Full data portability
- **Privacy**: End-to-end user data isolation
- **Scalability**: PostgreSQL handles growing datasets

## Development

### Type Generation

Generate TypeScript types from your Supabase schema:

```bash
npm run db:types
```

This updates `src/types/supabase.ts` with current database schema.

### Local Development

For local development with Supabase CLI:

```bash
# Install Supabase CLI
npm install supabase --save-dev

# Initialize local Supabase
supabase init

# Start local development
supabase start

# Apply migrations
supabase db reset

# Generate types
supabase gen types typescript --local > src/types/supabase.ts
```

## Real-time Features

The app uses Supabase real-time subscriptions for:
- Task updates across devices
- Routine changes
- New AI insights
- Shared board collaboration
- Notification delivery

## Security

- **Row Level Security**: All tables have RLS policies
- **User Isolation**: Data is strictly isolated by user_id
- **Secure Sharing**: Controlled access to shared boards
- **Auth Integration**: Seamless authentication flow
- **Privacy First**: User data never shared without consent