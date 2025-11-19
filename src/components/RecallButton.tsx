import React, { useState } from 'react';
import { WhereWasI } from './WhereWasI';
import { 
  QuestionMarkCircleIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface RecallButtonProps {
  className?: string;
}

export const RecallButton: React.FC<RecallButtonProps> = ({ className = '' }) => {
  const [showRecall, setShowRecall] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowRecall(true)}
        className={`fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-40 group ${className}`}
        title="Where Was I? - AI-powered recall"
      >
        <div className="relative">
          <QuestionMarkCircleIcon className="w-6 h-6" />
          <SparklesIcon className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300 opacity-75 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Where Was I?
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      <WhereWasI 
        isVisible={showRecall}
        onClose={() => setShowRecall(false)}
      />
    </>
  );
};