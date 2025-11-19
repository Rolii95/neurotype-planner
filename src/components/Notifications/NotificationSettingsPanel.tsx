import { useEffect, useMemo, useState } from 'react';
import {
  Notification,
  NotificationPriority,
  NotificationSettings,
  NotificationType,
  notificationService,
} from '../../services/notifications';

interface NotificationFormState {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionable: boolean;
  scheduled_for: string;
}

const defaultForm: NotificationFormState = {
  title: '',
  message: '',
  type: 'reminder',
  priority: 'medium',
  actionable: false,
  scheduled_for: '',
};

const toLocalInputValue = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toIsoString = (value: string) => (value ? new Date(value).toISOString() : null);

export function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<NotificationSettings>(() => notificationService.getSettings());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [form, setForm] = useState<NotificationFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await notificationService.getAllNotifications();
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSettingsChange = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    notificationService.saveSettings(updated);
  };

  const handleNestedSettingsChange = <K extends keyof NotificationSettings, T extends keyof NotificationSettings[K]>(
    key: K,
    nestedKey: T,
    value: NotificationSettings[K][T]
  ) => {
    const updated = {
      ...settings,
      [key]: {
        ...(settings[key] as any || {}),
        [nestedKey]: value,
      },
    };
    setSettings(updated);
    notificationService.saveSettings(updated);
  };

  const handleFormChange = (field: keyof NotificationFormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        priority: form.priority,
        actionable: form.actionable,
        scheduled_for: form.scheduled_for ? toIsoString(form.scheduled_for) : null,
      };

      if (editingId) {
        await notificationService.updateNotification(editingId, payload);
      } else {
        await notificationService.createNotification(payload);
      }

      await loadNotifications();
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (notification: Notification) => {
    setEditingId(notification.id);
    setForm({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      actionable: notification.actionable,
      scheduled_for: notification.scheduled_for ? toLocalInputValue(notification.scheduled_for) : '',
    });
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    await loadNotifications();
    if (editingId === id) {
      resetForm();
    }
  };

  const statusLabel = (notification: Notification) => {
    if (notification.dismissed_at) return 'Dismissed';
    if (notification.read_at) return 'Read';
    if (notification.delivered_at) return 'Delivered';
    if (notification.scheduled_for && new Date(notification.scheduled_for) > new Date()) return 'Scheduled';
    return 'Pending';
  };

  const pendingCount = useMemo(
    () => notifications.filter((n) => !n.read_at && !n.dismissed_at).length,
    [notifications]
  );

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-2 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure how often we reach out and when to keep things quiet.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Enable notifications</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Turn everything on or off with one switch.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleSettingsChange('enabled', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Suggestions frequency</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Control how often AI nudges appear.</p>
            </div>
            <select
              value={settings.suggestions.frequency}
              onChange={(e) =>
                handleNestedSettingsChange('suggestions', 'frequency', e.target.value as NotificationSettings['suggestions']['frequency'])
              }
              className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 px-3 py-1.5 text-sm"
            >
              <option value="realtime">Real-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2 text-sm">
              Task reminders
              <input
                type="checkbox"
                checked={settings.taskReminders.enabled}
                onChange={(e) =>
                  handleNestedSettingsChange('taskReminders', 'enabled', e.target.checked)
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2 text-sm">
              Celebrations
              <input
                type="checkbox"
                checked={settings.celebrations.enabled}
                onChange={(e) =>
                  handleNestedSettingsChange('celebrations', 'enabled', e.target.checked)
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
          </div>

          {settings.quietHours.enabled && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
                Quiet hours start
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) =>
                    handleNestedSettingsChange('quietHours', 'start', e.target.value)
                  }
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                />
              </label>
              <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
                Quiet hours end
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) =>
                    handleNestedSettingsChange('quietHours', 'end', e.target.value)
                  }
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                />
              </label>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={settings.quietHours.enabled}
              onChange={(e) =>
                handleNestedSettingsChange('quietHours', 'enabled', e.target.checked)
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            Enable quiet hours
          </label>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingId ? 'Edit notification' : 'Create notification'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Draft custom reminders, nudges, or updates and control when they appear.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
            Title
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
              placeholder="Friendly reminder"
            />
          </label>

          <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
            Message
            <textarea
              value={form.message}
              onChange={(e) => handleFormChange('message', e.target.value)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
              rows={3}
              placeholder="Don't forget to log your energy levels this afternoon."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
              Type
              <select
                value={form.type}
                onChange={(e) => handleFormChange('type', e.target.value as NotificationType)}
                className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
              >
                <option value="reminder">Reminder</option>
                <option value="celebration">Celebration</option>
                <option value="suggestion">Suggestion</option>
                <option value="warning">Warning</option>
                <option value="update">Update</option>
                <option value="social">Social</option>
              </select>
            </label>

            <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
              Priority
              <select
                value={form.priority}
                onChange={(e) => handleFormChange('priority', e.target.value as NotificationPriority)}
                className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
              Scheduled for (optional)
              <input
                type="datetime-local"
                value={form.scheduled_for}
                onChange={(e) => handleFormChange('scheduled_for', e.target.value)}
                className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.actionable}
                onChange={(e) => handleFormChange('actionable', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Add action buttons
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {editingId ? 'Update notification' : 'Create notification'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-3 py-2 text-sm rounded-lg border border-gray-300">
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Notification history
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pendingCount} active notifications ready to go.
            </p>
          </div>
          <button
            onClick={loadNotifications}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-500">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{notification.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
                  </div>
                  <div className="text-sm text-gray-500">{statusLabel(notification)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                    Type: {notification.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                    Priority: {notification.priority}
                  </span>
                  {notification.scheduled_for && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                      Scheduled: {new Date(notification.scheduled_for).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEdit(notification)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
