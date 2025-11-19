# Collaborative Features Integration Guide

## Overview
This guide provides step-by-step instructions for integrating the comprehensive collaboration and privacy features into the Universal Neurotype Planner.

## ✅ What's Already Implemented

### 1. Database Infrastructure
- **PostgreSQL Schema**: Complete collaboration schema with 6 tables
  - `collaborative_boards`: Board metadata and settings
  - `board_collaborators`: User access and roles
  - `board_invitations`: Invitation management
  - `board_privacy_settings`: Privacy controls and sharing
  - `board_quick_lock`: Quick lock functionality
  - `audit_logs`: Activity tracking and compliance

- **Row Level Security**: Comprehensive RLS policies protecting user data
- **Database Types**: Generated TypeScript types for type-safe operations

### 2. Backend Services
- **AuthorizationService**: Role-based access control and permissions
- **CollaborationAPI**: Complete CRUD operations for collaboration
- **QuickLockService**: Board locking and security controls
- **WebSocketService**: Real-time collaboration infrastructure

### 3. React Context & State
- **CollaborationContext**: Centralized state management
- **Type-safe hooks**: useCollaboration, useBoardPermissions, useQuickLock
- **Error boundaries**: Comprehensive error handling

### 4. UI Components
- **CollaborativeBoardInterface**: Main integration component
- **Privacy Control Modals**: Settings, quick lock, audit viewer
- **Real-time Components**: Live cursors, presence indicators
- **Dashboard Integration**: CollaborationDashboardSection

## 🔧 Integration Steps

### Step 1: Database Setup
```sql
-- Execute the schema in your Supabase dashboard
-- File: src/features/collaboration/database/schema.sql
```

### Step 2: Environment Configuration
```bash
# Add to your .env file
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Install Dependencies
```bash
npm install socket.io-client @headlessui/react
npm install --save-dev jest-axe @testing-library/jest-dom
```

### Step 4: Update App.tsx
```tsx
// Replace your existing App.tsx with:
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';

// Import collaboration routes
import { CollaborationRoutes } from './features/collaboration/routes/CollaborationRoutes';

// Your existing pages
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';

export const App: React.FC = () => {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Add collaboration routes */}
            <Route path="/collaborate/*" element={<CollaborationRoutes />} />
            <Route path="/board/:boardId" element={<CollaborationRoutes />} />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
};
```

### Step 5: Update Dashboard
```tsx
// In your Dashboard component, add:
import { CollaborationDashboardSection } from '../features/collaboration/integration/CollaborationDashboardSection';

// Add to your dashboard:
<CollaborationDashboardSection />
```

### Step 6: Navigation Integration
```tsx
// Add to your main navigation:
import { UsersIcon } from '@heroicons/react/24/outline';

// Navigation item:
<Link to="/collaborate" className="nav-link">
  <UsersIcon className="h-5 w-5" />
  Collaborate
</Link>
```

## 🎯 Usage Examples

### Basic Board Access
```tsx
// Direct access to collaborative board
<Link to="/board/board-123">Open Board</Link>

// Or with workspace context
<Link to="/workspace/ws-456/board/board-123">Open Board</Link>
```

### Using Collaboration Context
```tsx
import { useCollaboration } from './features/collaboration/context/CollaborationContext';

function BoardComponent() {
  const {
    currentBoard,
    collaborators,
    permissions,
    loadBoard,
    inviteUser
  } = useCollaboration();

  // Load board
  useEffect(() => {
    loadBoard('board-123');
  }, []);

  // Check permissions
  if (!permissions?.canEdit) {
    return <div>Read-only access</div>;
  }

  return (
    <div>
      <h1>{currentBoard?.title}</h1>
      <p>{collaborators.length} collaborators</p>
    </div>
  );
}
```

### Privacy Controls
```tsx
import { useBoardPermissions } from './features/collaboration/context/CollaborationContext';

function PrivacyControlsExample() {
  const { canEdit, canInvite, canViewHistory } = useBoardPermissions('board-123');

  return (
    <div>
      {canEdit && <button>Edit Board</button>}
      {canInvite && <button>Invite Users</button>}
      {canViewHistory && <button>View History</button>}
    </div>
  );
}
```

## 🔐 Security Features

### Row Level Security
- Users can only access boards they own or are invited to
- Roles determine permissions (owner, editor, viewer)
- Privacy settings control sharing and visibility

### Privacy Controls
- **Board Visibility**: Private, shared with collaborators, or public
- **Sharing Settings**: Control copying, downloading, and printing
- **Quick Lock**: Temporary board locking for security
- **Audit Logging**: Complete activity tracking

### Data Protection
- All collaboration data encrypted in transit and at rest
- GDPR-compliant data retention policies
- User consent management for data sharing

## 🎨 Accessibility Features

### ARIA Compliance
- Comprehensive ARIA labels and descriptions
- Screen reader optimized navigation
- Keyboard accessibility for all interactions

### Neurotype-Adaptive Design
- Customizable visual sensory controls
- Reduced motion options for sensitive users
- High contrast mode support
- Font size and spacing adjustments

### Testing
```bash
# Run accessibility tests
npm run test:a11y

# The jest-axe framework is already configured
```

## 📊 Real-time Features

### Live Collaboration
- Real-time cursor tracking
- Presence indicators showing active users
- Live document synchronization
- Conflict resolution for simultaneous edits

### Connection Management
- Automatic reconnection handling
- Offline mode support
- Connection status indicators
- Graceful degradation

## 🚀 Performance Optimizations

### Code Splitting
- Lazy loading of collaboration components
- Route-based code splitting
- Dynamic imports for heavy features

### Caching
- Supabase query caching
- Optimistic updates for better UX
- Background sync for offline changes

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Accessibility Tests
```bash
npm run test:a11y
```

### Integration Tests
```bash
npm run test:integration
```

## 📝 API Reference

### CollaborationAPI Methods
- `getBoardCollaborators(boardId)`: Get board collaborators
- `inviteUser({ boardId, email, role })`: Send invitation
- `acceptInvitation(token)`: Accept invitation
- `changeCollaboratorRole({ boardId, collaboratorId, role })`: Update role
- `updateBoardPrivacy({ boardId, settings })`: Update privacy

### WebSocket Events
- `board:join`: Join board session
- `board:leave`: Leave board session
- `cursor:move`: Update cursor position
- `board:edit`: Real-time board changes

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection**
   - Verify Supabase URL and keys
   - Check RLS policies are applied
   - Ensure user authentication is working

2. **Real-time Not Working**
   - Check WebSocket connection
   - Verify Socket.io server configuration
   - Test network connectivity

3. **Permission Errors**
   - Verify user roles in database
   - Check RLS policy execution
   - Validate permission context

### Debug Mode
```tsx
// Enable debug logging
const { error } = useCollaboration();
console.log('Collaboration error:', error);
```

## 🔄 Migration Guide

If you have existing boards, run the migration script:
```sql
-- Migrate existing boards to collaborative format
INSERT INTO collaborative_boards (id, title, description, owner_id)
SELECT id, title, description, user_id FROM existing_boards;
```

## 📈 Analytics & Monitoring

### Usage Tracking
- Board access analytics
- Collaboration activity metrics
- User engagement statistics
- Performance monitoring

### Health Checks
- Database connection status
- WebSocket connectivity
- API response times
- Error rate monitoring

## 🎯 Next Steps

1. **Complete Integration**: Follow the steps above to integrate
2. **Customize UI**: Adapt components to match your design system
3. **Add Features**: Extend with additional collaboration tools
4. **Monitor Usage**: Set up analytics and performance monitoring
5. **Scale**: Consider load balancing for high-traffic scenarios

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the API documentation
3. Test with minimal examples
4. Validate database setup and permissions

---

**✅ Collaboration System Status: COMPLETE**
- ✅ Database schema with RLS policies
- ✅ TypeScript type safety
- ✅ Real-time WebSocket integration
- ✅ Privacy controls and security
- ✅ Accessibility compliance
- ✅ Error handling and boundaries
- ✅ Integration components ready

The collaboration system is production-ready and can be integrated following this guide.