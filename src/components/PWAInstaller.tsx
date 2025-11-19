import { useState } from 'react';
import { usePWA } from '../hooks/usePWA';

const DownloadIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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

const RefreshIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export function PWAInstaller() {
  const { isInstallable, isInstalled, isOnline, updateAvailable, install, reloadForUpdate } = usePWA();
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      setShowInstallPrompt(false);
    }
  };

  if (isInstalled) {
    return null; // Don't show anything if already installed
  }

  return (
    <>
      {/* Install Prompt */}
      {isInstallable && showInstallPrompt && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Dismiss"
            >
              <XIcon className="w-4 h-4 text-gray-500" />
            </button>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Install Neurotype Planner
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Install as an app for offline access and a better experience
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isInstalling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Installing...</span>
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="w-4 h-4" />
                        <span>Install</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowInstallPrompt(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white rounded-lg shadow-lg px-6 py-3 flex items-center gap-3">
            <RefreshIcon className="w-5 h-5" />
            <span className="font-medium">New version available!</span>
            <button
              onClick={reloadForUpdate}
              className="ml-2 px-4 py-1 bg-white text-green-600 rounded font-medium hover:bg-gray-100 transition-colors"
            >
              Update Now
            </button>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-40 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500 rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            You're offline
          </span>
        </div>
      )}
    </>
  );
}
