import React, { useState } from 'react';
import { useMatrixStore } from '../../stores/useMatrixStore';
import { useToast } from '../../contexts/ToastContext';
import { MatrixViewConfig } from '../../types/matrix';
import { Task } from '../../types';
import { 
  Squares2X2Icon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface MatrixHeaderProps {
  viewConfig: MatrixViewConfig;
  onViewConfigChange: (updates: Partial<MatrixViewConfig>) => void;
  totalTasks: number;
  tasksByQuadrant: Record<string, Task[]>;
}

export const MatrixHeader: React.FC<MatrixHeaderProps> = ({
  viewConfig,
  onViewConfigChange,
  totalTasks,
  tasksByQuadrant
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const toast = useToast();
  const autoPlanFromMatrix = useMatrixStore((s) => s.autoPlanFromMatrix);
  
  return (
    <div className="matrix-header">
      {/* Main Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Squares2X2Icon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Priority Matrix</h1>
            <p className="text-sm text-gray-600">
              {totalTasks} tasks organized by urgency and importance
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const scheduled = await autoPlanFromMatrix({ maxTasks: 6 });
                if (scheduled && scheduled > 0) {
                  toast.success(`Planned ${scheduled} task${scheduled > 1 ? 's' : ''} for today.`);
                } else {
                  toast.info('No tasks were scheduled. Try increasing availability or freeing up space.');
                }
              } catch (err) {
                console.error('Plan my day failed:', err);
                toast.error('Unable to auto-plan right now.');
              }
            }}
            className="px-3 py-1 rounded-md bg-amber-500 text-white text-sm hover:bg-amber-600"
          >
            Plan my day
          </button>
          
          {/* Neurotype Focus Selector */}
          <select
            value={viewConfig.neurotypeFocus}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onViewConfigChange({ 
              neurotypeFocus: e.target.value as MatrixViewConfig['neurotypeFocus']
            })}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Neurotype focus"
          >
            <option value="general">General View</option>
            <option value="adhd">ADHD Focus</option>
            <option value="autism">Autism Focus</option>
            <option value="dyslexia">Dyslexia Focus</option>
          </select>
          
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Matrix settings"
          >
            <CogIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="matrix-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {Object.entries(tasksByQuadrant).map(([quadrantId, tasks]: [string, Task[]]) => {
          const quadrantNames = {
            'urgent-important': 'Do First',
            'not-urgent-important': 'Schedule', 
            'urgent-not-important': 'Park',
            'not-urgent-not-important': 'Eliminate'
          };
          
          const colors = {
            'urgent-important': 'text-red-600 bg-red-50',
            'not-urgent-important': 'text-yellow-600 bg-yellow-50',
            'urgent-not-important': 'text-orange-600 bg-orange-50',
            'not-urgent-not-important': 'text-gray-600 bg-gray-50'
          };
          
          return (
            <div
              key={quadrantId}
              className={`stat-card p-3 rounded-lg border ${colors[quadrantId as keyof typeof colors] || 'text-gray-600 bg-gray-50'}`}
            >
              <div className="text-2xl font-bold">{tasks.length}</div>
              <div className="text-sm font-medium">
                {quadrantNames[quadrantId as keyof typeof quadrantNames] || quadrantId}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
            Matrix Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* View Options */}
            <div className="setting-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewConfig.showQuadrantDescriptions}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onViewConfigChange({ 
                      showQuadrantDescriptions: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Show descriptions</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewConfig.showTaskDetails}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onViewConfigChange({ 
                      showTaskDetails: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Show task details</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewConfig.compactMode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onViewConfigChange({ 
                      compactMode: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Compact mode</span>
                </label>
              </div>
            </div>
            
            {/* Color Mode */}
            <div className="setting-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Mode
              </label>
              <select
                value={viewConfig.colorMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onViewConfigChange({ 
                  colorMode: e.target.value as MatrixViewConfig['colorMode']
                })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="standard">Standard</option>
                <option value="high-contrast">High Contrast</option>
                <option value="colorblind-safe">Colorblind Safe</option>
              </select>
            </div>
            
            {/* Neurotype Focus */}
            <div className="setting-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Neurotype Optimization
              </label>
              <select
                value={viewConfig.neurotypeFocus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onViewConfigChange({ 
                  neurotypeFocus: e.target.value as MatrixViewConfig['neurotypeFocus']
                })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="adhd">ADHD (Fast scanning, minimal clutter)</option>
                <option value="autism">Autism (Consistent patterns, detailed info)</option>
                <option value="dyslexia">Dyslexia (High contrast, clear fonts)</option>
              </select>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Keyboard shortcuts: Arrow keys to navigate, Space to select, E to edit, C to complete
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
