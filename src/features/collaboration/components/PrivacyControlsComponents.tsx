import React, { useState, useEffect } from 'react';
import { useCollaboration } from '../context/CollaborationContext';
import { AuthorizationService } from '../middleware/auth';
import { PrivacyControlsAPI } from '../api';
import { PrivacySettings, AuditLogEntry, QuickLockSettings } from '../types';

// Icons (using simple SVG since lucide-react isn't available)
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  boardId
}) => {
  const { checkPermission } = useCollaboration();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManagePrivacy = checkPermission(boardId, 'manage_privacy');

  useEffect(() => {
    if (isOpen && boardId) {
      loadSettings();
    }
  }, [isOpen, boardId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await PrivacyControlsAPI.getPrivacySettings(boardId);
      setSettings(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !canManagePrivacy) return;

    try {
      setSaving(true);
      setError(null);
      await PrivacyControlsAPI.updatePrivacySettings(boardId, settings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ShieldIcon />
            Privacy & Security Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!canManagePrivacy && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <AlertIcon />
              <p className="ml-2 text-sm text-yellow-800">
                You don't have permission to modify privacy settings for this board.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <AlertIcon />
              <p className="ml-2 text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Visibility Settings */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <EyeIcon />
                Visibility Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Board Visibility</label>
                    <p className="text-sm text-gray-600">Who can see this board exists</p>
                  </div>
                  <select
                    value={settings.boardVisibility}
                    onChange={(e) => updateSetting('boardVisibility', e.target.value)}
                    disabled={!canManagePrivacy}
                    className="rounded-md border-gray-300 text-sm disabled:bg-gray-100"
                  >
                    <option value="private">Private (collaborators only)</option>
                    <option value="organization">Organization members</option>
                    <option value="public">Public (anyone with link)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Task Visibility</label>
                    <p className="text-sm text-gray-600">Default visibility for new tasks</p>
                  </div>
                  <select
                    value={settings.taskVisibility}
                    onChange={(e) => updateSetting('taskVisibility', e.target.value)}
                    disabled={!canManagePrivacy}
                    className="rounded-md border-gray-300 text-sm disabled:bg-gray-100"
                  >
                    <option value="all">All collaborators</option>
                    <option value="editors">Editors and above</option>
                    <option value="owner">Owner only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Protection */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <LockIcon />
                Content Protection
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Enable Quick Lock</label>
                    <p className="text-sm text-gray-600">Allow instant content masking</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableQuickLock}
                    onChange={(e) => updateSetting('enableQuickLock', e.target.checked)}
                    disabled={!canManagePrivacy}
                    className="rounded border-gray-300 disabled:bg-gray-100"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Auto-lock timeout</label>
                    <p className="text-sm text-gray-600">Minutes before auto-lock (0 = disabled)</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={settings.autoLockTimeout}
                    onChange={(e) => updateSetting('autoLockTimeout', parseInt(e.target.value))}
                    disabled={!canManagePrivacy}
                    className="w-20 rounded-md border-gray-300 text-sm disabled:bg-gray-100"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Mask sensitive content</label>
                    <p className="text-sm text-gray-600">Hide content when quick lock is active</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maskSensitiveContent}
                    onChange={(e) => updateSetting('maskSensitiveContent', e.target.checked)}
                    disabled={!canManagePrivacy}
                    className="rounded border-gray-300 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Data Handling */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <SettingsIcon />
                Data Handling
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Enable audit logging</label>
                    <p className="text-sm text-gray-600">Track all board activities</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableAuditLog}
                    onChange={(e) => updateSetting('enableAuditLog', e.target.checked)}
                    disabled={!canManagePrivacy}
                    className="rounded border-gray-300 disabled:bg-gray-100"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Allow data export</label>
                    <p className="text-sm text-gray-600">Let collaborators export board data</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowDataExport}
                    onChange={(e) => updateSetting('allowDataExport', e.target.checked)}
                    disabled={!canManagePrivacy}
                    className="rounded border-gray-300 disabled:bg-gray-100"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Retention period (days)</label>
                    <p className="text-sm text-gray-600">How long to keep deleted items (0 = forever)</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={settings.dataRetentionDays}
                    onChange={(e) => updateSetting('dataRetentionDays', parseInt(e.target.value))}
                    disabled={!canManagePrivacy}
                    className="w-20 rounded-md border-gray-300 text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          {canManagePrivacy && (
            <button
              onClick={handleSave}
              disabled={saving || !settings}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              Save Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface QuickLockPanelProps {
  boardId: string;
  className?: string;
}

export const QuickLockPanel: React.FC<QuickLockPanelProps> = ({
  boardId,
  className = ''
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [settings, setSettings] = useState<QuickLockSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuickLockSettings();
  }, [boardId]);

  const loadQuickLockSettings = async () => {
    try {
      const response = await PrivacyControlsAPI.getQuickLockSettings(boardId);
      setSettings(response);
      setIsLocked(response.isActive);
    } catch (err) {
      console.error('Failed to load quick lock settings:', err);
    }
  };

  const toggleQuickLock = async () => {
    try {
      setLoading(true);
      if (isLocked) {
        await PrivacyControlsAPI.deactivateQuickLock(boardId);
      } else {
        await PrivacyControlsAPI.activateQuickLock(boardId);
      }
      setIsLocked(!isLocked);
    } catch (err) {
      console.error('Failed to toggle quick lock:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!settings?.enabled) {
    return null;
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isLocked ? 'bg-red-100' : 'bg-green-100'}`}>
            {isLocked ? (
              <LockIcon />
            ) : (
              <ShieldIcon />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              Quick Lock {isLocked ? 'Active' : 'Ready'}
            </h3>
            <p className="text-sm text-gray-600">
              {isLocked 
                ? 'Content is masked for privacy' 
                : 'Click to instantly hide sensitive content'
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={toggleQuickLock}
          disabled={loading}
          className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${
            isLocked
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          aria-label={isLocked ? 'Unlock board' : 'Lock board'}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : isLocked ? (
            'Unlock'
          ) : (
            'Lock Now'
          )}
        </button>
      </div>
      
      {isLocked && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Privacy mode active:</strong> Sensitive content is hidden from view. 
            Collaborators will see masked placeholders until unlocked.
          </p>
        </div>
      )}
    </div>
  );
};

interface AuditLogViewerProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  boardId,
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    action: '',
    user: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs();
    }
  }, [isOpen, filter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await PrivacyControlsAPI.getAuditLogs(boardId, filter);
      setLogs(response);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const response = await PrivacyControlsAPI.exportAuditLogs(boardId, filter);
      const blob = new Blob([response], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `board-${boardId}-audit-logs.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <span className="text-green-600">+</span>;
      case 'update':
        return <span className="text-blue-600">✏</span>;
      case 'delete':
        return <span className="text-red-600">🗑</span>;
      case 'invite':
        return <span className="text-purple-600">👥</span>;
      default:
        return <span className="text-gray-600">•</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Audit Log</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={exportLogs}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <DownloadIcon />
              Export
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="invite">Invite</option>
            <option value="share">Share</option>
          </select>

          <input
            type="text"
            placeholder="Filter by user..."
            value={filter.user}
            onChange={(e) => setFilter({ ...filter, user: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          />

          <input
            type="date"
            placeholder="From date"
            value={filter.dateFrom}
            onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          />

          <input
            type="date"
            placeholder="To date"
            value={filter.dateTo}
            onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          />
        </div>

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit log entries found for the selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {log.userName}
                          </span>
                          <span className="text-sm text-gray-600">
                            {log.action}
                          </span>
                          <span className="text-sm text-gray-600">
                            {log.resourceType}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {log.description}
                        </p>
                        
                        {log.details && (
                          <div className="text-xs text-gray-500 bg-gray-100 rounded p-2 font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 ml-4">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ContentMaskingProps {
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ContentMasking: React.FC<ContentMaskingProps> = ({
  isActive,
  children,
  className = ''
}) => {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="filter blur-sm select-none pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center">
        <div className="text-center">
          <LockIcon />
          <p className="text-sm text-gray-600 mt-2">
            Content masked for privacy
          </p>
        </div>
      </div>
    </div>
  );
};