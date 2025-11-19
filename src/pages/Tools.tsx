import React, { useState } from 'react';
import { TaskChunking } from '../components/TaskChunking';
import { BodyDoubling } from '../components/BodyDoubling';

const ToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chunking' | 'doubling'>('chunking');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chunking')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'chunking'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🧩 Task Chunking
            </button>
            <button
              onClick={() => setActiveTab('doubling')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'doubling'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              👥 Body Doubling
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'chunking' ? <TaskChunking /> : <BodyDoubling />}
      </div>
    </div>
  );
};

export default ToolsPage;
