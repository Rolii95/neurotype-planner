import { useEffect, useMemo, useRef, useState } from 'react';
import {
  notificationService,
  Notification,
  NotificationSettings,
} from '../services/notifications';

const BellIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type NotificationFilter = 'all' | Notification['type'];

const notificationFilters: { id: NotificationFilter; label: string; description: string }[] = [
  { id: 'all', label: 'All', description: 'Latest notifications' },
  { id: 'reminder', label: 'Reminders', description: 'Time-sensitive nudges' },
  { id: 'celebration', label: 'Celebrations', description: 'Wins and streaks' },
  { id: 'suggestion', label: 'Suggestions', description: 'AI-powered tips' },
  { id: 'warning', label: 'Warnings', description: 'Important alerts' },
  { id: 'update', label: 'Updates', description: 'System changes' },
  { id: 'social', label: 'Social', description: 'Invites & mentions' },
];

const priorityBadgeStyles: Record<Notification['priority'], string> = {
  low: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

const priorityCopy: Record<Notification['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface NotificationCenterProps {
  inline?: boolean;
}

export function NotificationCenter({ inline = false }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(inline);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(() => notificationService.getSettings());
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [bulkAction, setBulkAction] = useState<'read' | 'dismiss' | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const RECENT_LIMIT = 25;

  const loadRecentNotifications = async () => {
    const items = await notificationService.getRecentNotifications(RECENT_LIMIT);
    setNotifications(items);
  };

  useEffect(() => {
    loadRecentNotifications();
    const unsubscribe = notificationService.subscribeToNotifications((notification) => {
      setNotifications((prev) => {
        const existing = prev.filter((n) => n.id !== notification.id);
        return [notification, ...existing].slice(0, RECENT_LIMIT);
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isOpen || inline) return;
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [inline, isOpen]);

  useEffect(() => {
    if (!isOpen || inline) return;

    setSettings(notificationService.getSettings());

    const updatePosition = () => {
      const trigger = buttonRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const maxWidth = 384; // 24rem
      const horizontalPadding = 16;
      const panelWidth = Math.min(maxWidth, viewportWidth - horizontalPadding * 2);
      const desiredLeft = rect.right - panelWidth;
      const clampedLeft = Math.min(
        Math.max(desiredLeft, horizontalPadding),
        viewportWidth - panelWidth - horizontalPadding
      );
      const top = rect.bottom + 8;

      setPopoverStyle({
        width: panelWidth,
        top,
        left: clampedLeft,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [inline, isOpen]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(notification => notification.type === activeFilter);
  }, [activeFilter, notifications]);

  const filterCounts = useMemo(() => {
    const counts: Record<NotificationFilter, number> = {
      all: notifications.length,
      reminder: 0,
      celebration: 0,
      suggestion: 0,
      warning: 0,
      update: 0,
      social: 0,
    };

    notifications.forEach(notification => {
      counts[notification.type] += 1;
    });

    return counts;
  }, [notifications]);

  const activeFilterMeta = notificationFilters.find(filter => filter.id === activeFilter);
  const bulkLabel = activeFilter === 'all'
    ? 'all'
    : activeFilterMeta?.label.toLowerCase() ?? 'selected';

  const quietHoursActive = useMemo(() => {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = settings.quietHours;

    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    return currentTime >= start && currentTime < end;
  }, [settings.quietHours]);

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    const timestamp = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read_at: timestamp } : notification))
    );
  };

  const handleDismiss = async (id: string) => {
    await notificationService.dismissNotification(id);
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const handleBulkAction = async (action: 'read' | 'dismiss') => {
    const target =
      action === 'read'
        ? filteredNotifications.filter((notification) => !notification.read_at)
        : filteredNotifications;
    const ids = target.map((notification) => notification.id);
    if (ids.length === 0) return;

    setBulkAction(action);

    try {
      if (action === 'read') {
        await notificationService.markNotificationsAsRead(ids);
        const timestamp = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((notification) =>
            ids.includes(notification.id) ? { ...notification, read_at: timestamp } : notification
          )
        );
      } else {
        await notificationService.dismissNotifications(ids);
        setNotifications((prev) => prev.filter((notification) => !ids.includes(notification.id)));
      }
    } finally {
      setBulkAction(null);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    const icons = {
      reminder: '📋',
      celebration: '🎉',
      suggestion: '💡',
      warning: '⚠️',
      update: '🔔',
      social: '👥',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (priority: Notification['priority']) => {
    const colors = {
      low: 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600',
      medium: 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700',
      high: 'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700',
      urgent: 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700',
    };
    return colors[priority];
  };

  const emptyStateCopy = notifications.length === 0
    ? "You're all caught up!"
    : `No ${bulkLabel} notifications right now.`;

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const popoverPanelClasses =
    'max-h-[560px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col';

  const panelClass = inline ? `relative w-full ${popoverPanelClasses}` : `fixed z-50 ${popoverPanelClasses}`;

  const handlePauseToggle = () => {
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    notificationService.saveSettings(updated);
  };

  const handleToggleRead = async (notification: Notification) => {
    if (notification.read_at) {
      await notificationService.markAsUnread(notification.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, read_at: undefined } : item))
      );
    } else {
      await notificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    await notificationService.dismissNotifications(notifications.map((n) => n.id));
    setNotifications([]);
  };

  const panel = (
    <div
      className={panelClass.replace(/\s+/g, ' ')}
      style={inline ? undefined : popoverStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activeFilterMeta?.description || 'Latest alerts from across the app'}
            </p>
            {quietHoursActive && (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6 2a1 1 0 00-1 1v2.268A6 6 0 002 11v1l-1 2h18l-1-2v-1a6 6 0 00-3-5.232V3a1 1 0 00-1-1H6zM8 17a2 2 0 104 0H8z" />
                </svg>
                Quiet hours active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => handleBulkAction('read')}
              disabled={filteredNotifications.filter((n) => !n.read_at).length === 0 || bulkAction !== null}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {bulkAction === 'read' ? 'Marking...' : `Mark ${bulkLabel} read`}
            </button>
            <button
              onClick={() => handleBulkAction('dismiss')}
              disabled={filteredNotifications.length === 0 || bulkAction !== null}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {bulkAction === 'dismiss' ? 'Clearing...' : `Dismiss ${bulkLabel}`}
            </button>
            <button
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
        <label className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/70 rounded-lg px-3 py-2">
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Pause notifications</p>
            <p className="text-xs">Temporarily stop new alerts from showing up.</p>
          </div>
          <input
            type="checkbox"
            checked={!settings.enabled}
            onChange={handlePauseToggle}
            className="w-4 h-4 text-blue-600 rounded"
          />
        </label>
      </div>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex flex-wrap gap-2">
              {notificationFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeFilter === filter.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  aria-pressed={activeFilter === filter.id}
                >
                  <span>{filter.label}</span>
                  {filterCounts[filter.id] > 0 && (
                    <span className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] ${activeFilter === filter.id
                      ? 'bg-white/20'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                      }`}>
                      {filterCounts[filter.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center" aria-live="polite">
                  <BellIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">{emptyStateCopy}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Try adjusting your filters or creating a new task.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredNotifications.map((notification) => {
                    const isRead = Boolean(notification.read_at);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${getNotificationColor(notification.priority)} ${isRead ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
                                  <span className={`px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${priorityBadgeStyles[notification.priority]}`}>
                                    {priorityCopy[notification.priority]}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">{formatTimestamp(notification.created_at)}</span>
                                  {isRead && <span className="text-gray-500 dark:text-gray-400">Read</span>}
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                                  {notification.message}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleToggleRead(notification)}
                                  className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                  title={isRead ? 'Mark as unread' : 'Mark as read'}
                                >
                                  <CheckIcon
                                    className={`w-4 h-4 ${isRead ? 'text-gray-400' : 'text-green-600 dark:text-green-400'}`}
                                  />
                                </button>
                                <button
                                  onClick={() => handleDismiss(notification.id)}
                                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                  title="Dismiss"
                                >
                                  <XIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </button>
                              </div>
                            </div>

                            {notification.actionable && notification.actions && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {notification.actions.map((action, index) => (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      window.dispatchEvent(new CustomEvent('notification-action', {
                                        detail: action,
                                      }));
                                      handleMarkAsRead(notification.id);
                                    }}
                                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
    </div>
  );

  if (inline) {
    return panel;
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {panel}
        </>
      )}
    </div>
  );
}

