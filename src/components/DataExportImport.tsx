import { useState } from 'react';
import { dataPortabilityService, ExportFormat, ImportResult } from '../services/dataPortability';
import { useToast } from '../contexts/ToastContext';

const DownloadIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const UploadIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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

export function DataExportImport() {
  const toast = useToast();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeRoutines, setIncludeRoutines] = useState(true);
  const [includeMoodLogs, setIncludeMoodLogs] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let blob: Blob;
      let filename: string;

      const options = {
        format: exportFormat,
        includeTasks,
        includeRoutines,
        includeMoodLogs,
        includeSettings,
      };

      switch (exportFormat) {
        case 'json':
          blob = await dataPortabilityService.exportToJSON(options);
          filename = `neurotype-planner-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'csv':
          blob = await dataPortabilityService.exportToCSV(options);
          filename = `neurotype-planner-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'markdown':
          blob = await dataPortabilityService.exportToMarkdown(options);
          filename = `neurotype-planner-${new Date().toISOString().split('T')[0]}.md`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      dataPortabilityService.downloadExport(blob, filename);
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      let result: ImportResult;

      if (file.name.endsWith('.json')) {
        result = await dataPortabilityService.importFromJSON(file);
      } else if (file.name.endsWith('.csv')) {
        result = await dataPortabilityService.importFromCSV(file);
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV.');
      }

      setImportResult(result);
      setShowResults(true);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        imported: { tasks: 0, routines: 0, moodLogs: 0 },
        errors: [error instanceof Error ? error.message : 'Import failed'],
      });
      setShowResults(true);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleBackup = async () => {
    setIsExporting(true);
    try {
      const blob = await dataPortabilityService.createBackup();
      const filename = `neurotype-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
      dataPortabilityService.downloadExport(blob, filename);
      toast.success('Backup created successfully!');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Data Export & Import
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Export your data for backup or transfer to other tools. Import data from previous exports.
        </p>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <DownloadIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Export Data
          </h3>
        </div>

        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['json', 'csv', 'markdown'] as ExportFormat[]).map((format) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                  exportFormat === format
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Data Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Include in Export
          </label>
          <div className="space-y-2">
            {[
              { key: 'tasks', label: 'Tasks', state: includeTasks, setState: setIncludeTasks },
              { key: 'routines', label: 'Routines', state: includeRoutines, setState: setIncludeRoutines },
              { key: 'moodLogs', label: 'Mood Logs', state: includeMoodLogs, setState: setIncludeMoodLogs },
              { key: 'settings', label: 'Settings & Preferences', state: includeSettings, setState: setIncludeSettings },
            ].map(({ key, label, state, setState }) => (
              <label key={key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                <input
                  type="checkbox"
                  checked={state}
                  onChange={(e) => setState(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <DownloadIcon className="w-5 h-5" />
              <span>Export Data</span>
            </>
          )}
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <UploadIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import Data
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload a JSON or CSV file exported from Neurotype Planner. Your existing data will not be deleted.
        </p>

        {/* Import Button */}
        <label className="block">
          <input
            type="file"
            accept=".json,.csv"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
          />
          <div className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Importing...</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-5 h-5" />
                <span>Select File to Import</span>
              </>
            )}
          </div>
        </label>

        {/* Import Results */}
        {showResults && importResult && (
          <div className={`mt-4 p-4 rounded-lg border-2 ${
            importResult.success
              ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
              : 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
          }`}>
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckIcon className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <XIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className={`font-semibold mb-2 ${
                  importResult.success
                    ? 'text-green-900 dark:text-green-400'
                    : 'text-red-900 dark:text-red-400'
                }`}>
                  {importResult.success ? 'Import Successful!' : 'Import Failed'}
                </h4>
                
                {importResult.success && (
                  <div className="text-sm text-green-800 dark:text-green-300 space-y-1">
                    <p>✓ Imported {importResult.imported.tasks} tasks</p>
                    <p>✓ Imported {importResult.imported.routines} routines</p>
                    <p>✓ Imported {importResult.imported.moodLogs} mood logs</p>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Errors:</p>
                    <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setShowResults(false)}
                  className="mt-3 text-sm underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Backup Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              💾 Quick Backup
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Create a complete backup of all your data including tasks, routines, mood logs, and settings. Recommended to backup regularly!
            </p>
            <button
              onClick={handleBackup}
              disabled={isExporting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              Create Backup Now
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">
          💡 Tips
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong>JSON format</strong> preserves all data and can be re-imported</li>
          <li>• <strong>CSV format</strong> works with spreadsheet programs like Excel</li>
          <li>• <strong>Markdown format</strong> is great for documentation and sharing</li>
          <li>• Create regular backups to protect your data</li>
          <li>• Imported data is added to your existing data, not replaced</li>
        </ul>
      </div>
    </div>
  );
}
