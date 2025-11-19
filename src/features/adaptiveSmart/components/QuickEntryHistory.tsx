import { useState, useEffect } from 'react';
import { useAdaptiveSmart } from './AdaptiveSmartContext';
import { QuickEntry } from '../types';
import { 
  MagnifyingGlassIcon, 
  TrashIcon, 
  EyeIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  PhotoIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface QuickEntryHistoryProps {
  className?: string;
  maxItems?: number;
  showSearch?: boolean;
}

export function QuickEntryHistory({ 
  className = '',
  maxItems = 20,
  showSearch = true 
}: QuickEntryHistoryProps) {
  const { state, actions, cognitiveProfile } = useAdaptiveSmart();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEntries, setFilteredEntries] = useState<QuickEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<QuickEntry | null>(null);

  // Filter entries based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(state.quickEntries.slice(0, maxItems));
    } else {
      const results = actions.searchQuickEntries(searchQuery).slice(0, maxItems);
      setFilteredEntries(results);
    }
  }, [searchQuery, state.quickEntries, maxItems, actions]);

  // Get type icon
  const getTypeIcon = (type: QuickEntry['type']) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'text':
        return <DocumentTextIcon className={`${iconClass} text-blue-500`} />;
      case 'voice':
        return <MicrophoneIcon className={`${iconClass} text-green-500`} />;
      case 'image':
        return <PhotoIcon className={`${iconClass} text-purple-500`} />;
      case 'link':
        return <LinkIcon className={`${iconClass} text-orange-500`} />;
    }
  };

  // Get processing status badge
  const getProcessingBadge = (processing: QuickEntry['processing']) => {
    const badgeClass = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
    
    switch (processing.status) {
      case 'processed':
        return <span className={`${badgeClass} bg-green-100 text-green-800`}>Processed</span>;
      case 'pending':
        return <span className={`${badgeClass} bg-yellow-100 text-yellow-800`}>Pending</span>;
      case 'failed':
        return <span className={`${badgeClass} bg-red-100 text-red-800`}>Failed</span>;
    }
  };

  // Get neurotype-specific styling
  const getNeuroStyles = () => {
    switch (cognitiveProfile?.neurotype) {
      case 'adhd':
        return {
          container: 'space-y-2',
          entry: 'border-l-4 border-l-blue-500 hover:shadow-md transform hover:scale-[1.01] transition-all',
          text: 'font-medium',
        };
      case 'autism':
        return {
          container: 'space-y-3',
          entry: 'border border-gray-200 hover:border-gray-300 transition-colors',
          text: 'font-normal',
        };
      case 'dyslexia':
        return {
          container: 'space-y-4',
          entry: 'border border-purple-200 hover:border-purple-300',
          text: 'text-lg leading-relaxed font-medium',
        };
      default:
        return {
          container: 'space-y-3',
          entry: 'border border-gray-200 hover:border-gray-300',
          text: 'font-normal',
        };
    }
  };

  const neuroStyles = getNeuroStyles();

  // Handle entry deletion
  const handleDelete = async (entryId: string) => {
    if (confirm('Delete this quick entry?')) {
      try {
        await actions.deleteQuickEntry(entryId);
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  // Handle text-to-speech
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = cognitiveProfile?.neurotype === 'dyslexia' ? 0.8 : 1;
      speechSynthesis.speak(utterance);
    }
  };

  // Get display content for entry
  const getEntryContent = (entry: QuickEntry): string => {
    switch (entry.type) {
      case 'text':
        return entry.content.text || '';
      case 'voice':
        return entry.content.transcript || '';
      case 'link':
        return entry.content.url || '';
      case 'image':
        return entry.content.fileName || 'Image';
      default:
        return '';
    }
  };

  // Get extracted insights
  const getExtractedInsights = (entry: QuickEntry) => {
    const extracted = entry.processing.extractedData;
    if (!extracted) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {extracted.intent && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {extracted.intent}
          </span>
        )}
        {extracted.category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            {extracted.category}
          </span>
        )}
        {extracted.sentiment && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            extracted.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
            extracted.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {extracted.sentiment}
          </span>
        )}
      </div>
    );
  };

  if (filteredEntries.length === 0 && !searchQuery) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Quick Entries</h3>
        <p className="text-gray-600">
          Start creating quick entries to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search */}
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quick entries..."
              className={`
                w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${cognitiveProfile?.neurotype === 'dyslexia' ? 'text-lg' : 'text-sm'}
              `}
            />
          </div>
        </div>
      )}

      {/* Entry list */}
      <div className={neuroStyles.container}>
        {filteredEntries.map((entry) => {
          const content = getEntryContent(entry);
          
          return (
            <div
              key={entry.id}
              className={`
                bg-white rounded-lg p-4 ${neuroStyles.entry}
                cursor-pointer transition-all duration-200
              `}
              onClick={() => setSelectedEntry(entry)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1">
                    {getTypeIcon(entry.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm text-gray-600 capitalize ${neuroStyles.text}`}>
                        {entry.type}
                      </span>
                      {getProcessingBadge(entry.processing)}
                    </div>
                    
                    <div className={`text-gray-900 ${neuroStyles.text} mb-2`}>
                      {entry.type === 'image' ? (
                        <div className="flex items-center gap-2">
                          <span>{entry.content.fileName}</span>
                          {entry.content.fileSize && (
                            <span className="text-xs text-gray-500">
                              ({Math.round(entry.content.fileSize / 1024)}KB)
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="line-clamp-2">{content}</p>
                      )}
                    </div>

                    {/* Tags */}
                    {entry.context.tags && entry.context.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {entry.context.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Extracted insights */}
                    {getExtractedInsights(entry)}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>
                        {format(entry.createdAt, 'MMM d, yyyy h:mm a')}
                      </span>
                      <span>
                        From {entry.context.source}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                  {(entry.type === 'text' || entry.type === 'voice') && 'speechSynthesis' in window && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeak(content);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Listen"
                    >
                      <SpeakerWaveIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      setSelectedEntry(entry);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No results */}
      {filteredEntries.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results</h3>
          <p className="text-gray-600">
            No quick entries match "{searchQuery}". Try a different search term.
          </p>
        </div>
      )}

      {/* Entry detail modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedEntry.type)}
                  <h3 className="text-lg font-medium text-gray-900 capitalize">
                    {selectedEntry.type} Entry
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="mb-4">
                {selectedEntry.type === 'image' && selectedEntry.content.imageUrl ? (
                  <img
                    src={selectedEntry.content.imageUrl}
                    alt={selectedEntry.content.fileName}
                    className="w-full rounded border"
                  />
                ) : (
                  <div className={`p-3 bg-gray-50 rounded border ${neuroStyles.text}`}>
                    {getEntryContent(selectedEntry)}
                  </div>
                )}
              </div>

              {/* Processing details */}
              {selectedEntry.processing.extractedData && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">AI Analysis</h4>
                  {getExtractedInsights(selectedEntry)}
                  
                  {selectedEntry.processing.extractedData.entities && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-600">Entities: </span>
                      <span className="text-xs">
                        {selectedEntry.processing.extractedData.entities.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="text-sm text-gray-600 space-y-1">
                <div>Created: {format(selectedEntry.createdAt, 'PPpp')}</div>
                <div>Source: {selectedEntry.context.source}</div>
                {selectedEntry.processedAt && (
                  <div>Processed: {format(selectedEntry.processedAt, 'PPpp')}</div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-2">
                {(selectedEntry.type === 'text' || selectedEntry.type === 'voice') && (
                  <button
                    onClick={() => handleSpeak(getEntryContent(selectedEntry))}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    <SpeakerWaveIcon className="h-4 w-4" />
                    Listen
                  </button>
                )}
                
                <button
                  onClick={() => handleDelete(selectedEntry.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
