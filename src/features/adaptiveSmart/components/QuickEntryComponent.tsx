import { useState, useRef, useEffect } from 'react';
import { 
  MicrophoneIcon, 
  PhotoIcon, 
  PaperAirplaneIcon,
  XMarkIcon,
  DocumentTextIcon,
  LinkIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { useAdaptiveSmart } from './AdaptiveSmartContext';
import { QuickEntry } from '../types';

interface QuickEntryComponentProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSubmit?: (entry: QuickEntry) => void;
  onCancel?: () => void;
  variant?: 'inline' | 'modal' | 'floating';
  allowedTypes?: ('text' | 'voice' | 'image' | 'link')[];
}

export function QuickEntryComponent({
  placeholder = 'Quick entry: text, voice, image, or link...',
  className = '',
  autoFocus = false,
  onSubmit,
  onCancel,
  variant = 'inline',
  allowedTypes = ['text', 'voice', 'image', 'link']
}: QuickEntryComponentProps) {
  const { actions, state, cognitiveProfile, deviceInfo } = useAdaptiveSmart();
  
  // State management
  const [inputType, setInputType] = useState<'text' | 'voice' | 'image' | 'link'>('text');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null); // SpeechRecognition type not available in TypeScript

  // Focus management
  useEffect(() => {
    if (autoFocus && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [autoFocus]);

  // Voice recognition setup
  useEffect(() => {
    if (deviceInfo.capabilities.speechRecognition && allowedTypes.includes('voice')) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceTranscript(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          setError(`Voice recognition error: ${event.error}`);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [deviceInfo.capabilities.speechRecognition, allowedTypes]);

  // Get neurotype-specific styling
  const getNeuroStyles = () => {
    switch (cognitiveProfile?.neurotype) {
      case 'adhd':
        return {
          container: 'border-2 border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200',
          input: 'text-lg font-medium',
          buttons: 'shadow-md hover:shadow-lg transform hover:scale-105 transition-all',
          focus: 'focus:ring-4 focus:ring-blue-300',
        };
      case 'autism':
        return {
          container: 'border border-gray-300 focus-within:border-gray-500',
          input: 'text-base',
          buttons: 'shadow-sm hover:shadow transition-shadow',
          focus: 'focus:ring-2 focus:ring-gray-400',
        };
      case 'dyslexia':
        return {
          container: 'border border-purple-300 focus-within:border-purple-500',
          input: 'text-xl leading-relaxed font-medium',
          buttons: 'shadow-sm hover:shadow',
          focus: 'focus:ring-2 focus:ring-purple-500',
        };
      default:
        return {
          container: 'border border-gray-300 focus-within:border-blue-500',
          input: 'text-base',
          buttons: 'shadow-sm hover:shadow',
          focus: 'focus:ring-2 focus:ring-blue-500',
        };
    }
  };

  const neuroStyles = getNeuroStyles();

  // Handle text input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    setError(null);
    
    // Auto-resize textarea
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  };

  // Handle voice recording
  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition not supported');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setVoiceTranscript('');
      setError(null);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setSelectedImage(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle link input
  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkUrl(e.target.value);
    setError(null);
  };

  // Validate and submit entry
  const handleSubmit = async () => {
    if (isProcessing) return;

    let content: QuickEntry['content'] = {};
    let hasContent = false;

    // Validate content based on input type
    switch (inputType) {
      case 'text':
        if (textInput.trim()) {
          content.text = textInput.trim();
          hasContent = true;
        }
        break;
      case 'voice':
        if (voiceTranscript.trim()) {
          content.transcript = voiceTranscript.trim();
          hasContent = true;
        }
        break;
      case 'image':
        if (selectedImage) {
          content.fileName = selectedImage.name;
          content.fileSize = selectedImage.size;
          content.imageUrl = imagePreview || '';
          hasContent = true;
        }
        break;
      case 'link':
        if (linkUrl.trim()) {
          // Basic URL validation
          try {
            new URL(linkUrl);
            content.url = linkUrl.trim();
            hasContent = true;
          } catch {
            setError('Please enter a valid URL');
            return;
          }
        }
        break;
    }

    if (!hasContent) {
      setError('Please provide some content');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create quick entry
      const entry: Omit<QuickEntry, 'id' | 'userId' | 'createdAt'> = {
        type: inputType,
        content,
        context: {
          source: window.location.pathname,
          tags: state.quickEntrySettings.defaultTags,
        },
        processing: {
          status: 'pending',
        },
      };

      await actions.createQuickEntry(entry);

      // Reset form
      resetForm();

      // Call onSubmit callback if provided
      if (onSubmit) {
        const fullEntry: QuickEntry = {
          ...entry,
          id: crypto.randomUUID(),
          userId: 'current-user', // Will be set by context
          createdAt: new Date(),
        };
        onSubmit(fullEntry);
      }

    } catch (error) {
      setError('Failed to save quick entry');
      console.error('Quick entry error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setTextInput('');
    setVoiceTranscript('');
    setSelectedImage(null);
    setImagePreview(null);
    setLinkUrl('');
    setError(null);
    setInputType('text');
    
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
    }
  };

  // Handle cancel
  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Get variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'modal':
        return 'bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto';
      case 'floating':
        return 'bg-white rounded-lg shadow-lg border p-4';
      default:
        return 'bg-white rounded-lg border p-4';
    }
  };

  return (
    <div className={`${getVariantStyles()} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Entry</h3>
        {variant === 'modal' && onCancel && (
          <button
            onClick={handleCancel}
            className={`p-1 rounded hover:bg-gray-100 ${neuroStyles.focus}`}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Type selector */}
      <div className="flex gap-2 mb-4">
        {allowedTypes.map((type) => {
          const isActive = inputType === type;
          const typeConfig = {
            text: { icon: DocumentTextIcon, label: 'Text' },
            voice: { icon: MicrophoneIcon, label: 'Voice' },
            image: { icon: PhotoIcon, label: 'Image' },
            link: { icon: LinkIcon, label: 'Link' },
          };
          
          const Icon = typeConfig[type].icon;
          
          // Check if type is available
          const isAvailable = type === 'voice' 
            ? deviceInfo.capabilities.speechRecognition
            : type === 'image'
            ? deviceInfo.capabilities.camera
            : true;

          return (
            <button
              key={type}
              onClick={() => setInputType(type)}
              disabled={!isAvailable}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                transition-colors ${neuroStyles.focus} ${neuroStyles.buttons}
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : isAvailable
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{typeConfig[type].label}</span>
            </button>
          );
        })}
      </div>

      {/* Input area */}
      <div className={`${neuroStyles.container} rounded-lg p-3 mb-4`}>
        {inputType === 'text' && (
          <textarea
            ref={textAreaRef}
            value={textInput}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`
              w-full resize-none border-0 outline-none bg-transparent
              ${neuroStyles.input} placeholder-gray-400
            `}
            rows={3}
          />
        )}

        {inputType === 'voice' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleVoiceToggle}
                disabled={!deviceInfo.capabilities.speechRecognition}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md font-medium
                  transition-colors ${neuroStyles.focus}
                  ${isRecording 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isRecording ? (
                  <>
                    <StopIcon className="h-4 w-4" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <MicrophoneIcon className="h-4 w-4" />
                    <span>Start Recording</span>
                  </>
                )}
              </button>
              
              {isRecording && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm">Recording...</span>
                </div>
              )}
            </div>
            
            {voiceTranscript && (
              <div className={`p-3 bg-gray-50 rounded border ${neuroStyles.input}`}>
                {voiceTranscript}
              </div>
            )}
          </div>
        )}

        {inputType === 'image' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md font-medium
                bg-blue-600 text-white hover:bg-blue-700 transition-colors
                ${neuroStyles.focus} ${neuroStyles.buttons}
              `}
            >
              <PhotoIcon className="h-4 w-4" />
              <span>Select Image</span>
            </button>
            
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-32 object-cover rounded border"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {inputType === 'link' && (
          <input
            type="url"
            value={linkUrl}
            onChange={handleLinkChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter URL..."
            className={`
              w-full border-0 outline-none bg-transparent
              ${neuroStyles.input} placeholder-gray-400
            `}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {cognitiveProfile?.neurotype === 'adhd' && (
            <span>💡 Tip: Use Cmd+Enter to submit quickly</span>
          )}
          {cognitiveProfile?.neurotype === 'dyslexia' && (
            <span>🎤 Voice input is available for easier entry</span>
          )}
          {cognitiveProfile?.neurotype === 'autism' && (
            <span>📝 All entries are automatically saved</span>
          )}
        </div>

        <div className="flex gap-2">
          {variant !== 'inline' && (
            <button
              onClick={handleCancel}
              className={`
                px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100
                rounded-md hover:bg-gray-200 transition-colors ${neuroStyles.focus}
              `}
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium
              bg-blue-600 text-white rounded-md hover:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors ${neuroStyles.focus} ${neuroStyles.buttons}
            `}
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Processing status */}
      {state.quickEntrySettings.autoProcessing && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            ✨ Auto-processing enabled - entries will be automatically categorized and processed
          </p>
        </div>
      )}
    </div>
  );
}