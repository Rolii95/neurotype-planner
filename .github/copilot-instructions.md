# Universal Neurotype Planner - Copilot Instructions

## Project Overview
This is a Progressive Web App (PWA) designed as an adaptive executive function support tool for neurodivergent users. The app features AI-powered recall, visual routine boards, mood tracking, and collaborative planning tools.

## Project Status: ✅ COMPLETE SCAFFOLD WITH SUPABASE
The project has been fully scaffolged with Supabase backend integration, replacing local IndexedDB with cloud PostgreSQL database for scalable, real-time functionality.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **AI Integration**: Hybrid approach (Local Ollama/WebLLM + Optional cloud AI)
- **Storage**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with automatic profile creation
- **Styling**: Tailwind CSS with accessibility-first design
- **PWA**: Service Worker, offline functionality, installable

## Key Features Implemented
1. **Project Structure**: Complete file organization with types, services, components
2. **Database Layer**: Supabase service with comprehensive table schema
3. **Authentication**: Supabase Auth integration with user profiles
4. **UI Components**: Error boundaries, loading spinners, accessibility features
5. **Routing**: React Router setup with lazy loading
6. **Context Providers**: Auth and accessibility contexts
7. **Configuration**: Vite, TypeScript, Tailwind, ESLint, Vitest configs
8. **PWA Setup**: Service worker and manifest configuration
9. **VS Code Tasks**: Development, build, test, and lint tasks
10. **Database Schema**: Complete PostgreSQL schema with RLS policies

## Getting Started
1. **Install Node.js 18+** (currently missing)
2. **Set up Supabase project** (see SUPABASE_SETUP.md)
3. **Configure environment**: Copy .env.example to .env with Supabase credentials
4. **Install dependencies**: `npm install`
5. **Run database migrations**: Execute SQL in Supabase dashboard
6. **Start development**: `npm run dev` or use VS Code task
7. **Build for production**: `npm run build`

## Development Guidelines
- Use TypeScript strictly for type safety
- All database operations go through Supabase service layer
- Implement proper error boundaries and loading states
- Follow accessibility best practices (ARIA, semantic HTML)
- Use Supabase real-time subscriptions for live updates
- Implement proper Row Level Security policies
- Design mobile-first with responsive layouts
- Use React Query for Supabase data management
- Implement proper PWA manifest and service worker

## Database Notes
- **Supabase PostgreSQL**: Replaces IndexedDB for scalable cloud storage
- **Real-time subscriptions**: Live updates across devices
- **Row Level Security**: User data isolation and privacy
- **Auth integration**: Automatic profile creation on signup
- **Type safety**: Generated TypeScript types from schema

## Next Steps for Development
1. Install Node.js and dependencies
2. Set up Supabase project and run migrations
3. Configure environment variables
4. Implement AI service integration (Ollama/WebLLM)
5. Build out individual page components with Supabase data
6. Add comprehensive testing with Supabase mocks
7. Implement real-time subscriptions
8. Set up CI/CD pipeline with Supabase integration