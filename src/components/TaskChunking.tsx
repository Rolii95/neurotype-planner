import React, { useState } from 'react';

interface TaskChunk {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  order: number;
}

export const TaskChunking: React.FC = () => {
  const [taskDescription, setTaskDescription] = useState('');
  const [chunks, setChunks] = useState<TaskChunk[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChunk, setCurrentChunk] = useState<number>(0);

  const chunkTask = async () => {
    setIsProcessing(true);
    
    // Simulate AI chunking (in real implementation, call AI service)
    setTimeout(() => {
      const generatedChunks: TaskChunk[] = [
        {
          id: '1',
          title: 'Research and gather information',
          description: 'Collect all necessary materials, data, and resources',
          estimatedTime: 15,
          difficulty: 'easy',
          completed: false,
          order: 1,
        },
        {
          id: '2',
          title: 'Create outline or structure',
          description: 'Organize information into logical sections',
          estimatedTime: 20,
          difficulty: 'medium',
          completed: false,
          order: 2,
        },
        {
          id: '3',
          title: 'Complete first section',
          description: 'Focus on getting the first part done',
          estimatedTime: 30,
          difficulty: 'medium',
          completed: false,
          order: 3,
        },
        {
          id: '4',
          title: 'Review and refine',
          description: 'Check for errors and improve quality',
          estimatedTime: 15,
          difficulty: 'easy',
          completed: false,
          order: 4,
        },
      ];
      
      setChunks(generatedChunks);
      setIsProcessing(false);
    }, 2000);
  };

  const completeChunk = (chunkId: string) => {
    setChunks(chunks.map(chunk =>
      chunk.id === chunkId ? { ...chunk, completed: true } : chunk
    ));
    
    const nextIncomplete = chunks.findIndex(c => !c.completed && c.id !== chunkId);
    if (nextIncomplete !== -1) {
      setCurrentChunk(nextIncomplete);
    }
  };

  const progress = chunks.length > 0
    ? (chunks.filter(c => c.completed).length / chunks.length) * 100
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Task Chunking Assistant 🧩
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Break down overwhelming tasks into manageable steps
        </p>
      </div>

      {chunks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Describe your task
          </label>
          <textarea
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="e.g., Write a research paper on climate change, organize home office, plan birthday party..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white h-32 mb-4"
          />
          
          <button
            onClick={chunkTask}
            disabled={!taskDescription.trim() || isProcessing}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '✨ Chunking Your Task...' : '🧩 Break Down Task'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Overall Progress
              </h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {chunks.filter(c => c.completed).length} of {chunks.length} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Chunks */}
          {chunks.map((chunk, index) => (
            <div
              key={chunk.id}
              className={`bg-white dark:bg-gray-800 rounded-lg p-6 border-2 transition-all ${
                chunk.completed
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : index === currentChunk
                  ? 'border-purple-500 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  chunk.completed
                    ? 'bg-green-500 text-white'
                    : index === currentChunk
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {chunk.completed ? '✓' : chunk.order}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {chunk.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {chunk.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-500">
                      ⏱️ {chunk.estimatedTime} min
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      chunk.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : chunk.difficulty === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {chunk.difficulty}
                    </span>
                  </div>

                  {!chunk.completed && (
                    <button
                      onClick={() => completeChunk(chunk.id)}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {progress === 100 && (
            <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-8 border-2 border-green-500 dark:border-green-700 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Task Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You successfully completed all chunks. Great job!
              </p>
              <button
                onClick={() => {
                  setChunks([]);
                  setTaskDescription('');
                  setCurrentChunk(0);
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Start New Task
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
