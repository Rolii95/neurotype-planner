import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TransitionCue as TransitionCueType } from '../../types/routine';
import { useAccessibility } from '../../hooks/useAccessibility';

interface TransitionCueProps {
  cue: TransitionCueType;
  isVisible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  className?: string;
}

interface MediaLoadState {
  isLoading: boolean;
  error: string | null;
  loaded: boolean;
}

const TransitionCue: React.FC<TransitionCueProps> = ({
  cue,
  isVisible,
  onDismiss,
  onComplete,
  className = ''
}) => {
  const [mediaState, setMediaState] = useState<MediaLoadState>({
    isLoading: false,
    error: null,
    loaded: false
  });
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Accessibility hook
  const { 
    getAccessibilityClasses, 
    announceToScreenReader, 
    handleKeyboardNavigation,
    focusElement 
  } = useAccessibility();

  // Initialize timer if auto-dismiss is enabled
  useEffect(() => {
    if (isVisible && cue.duration && !cue.isRequired) {
      setTimeRemaining(cue.duration);
      
      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            handleAutoDismiss();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      // Set auto-dismiss timer
      dismissTimerRef.current = setTimeout(() => {
        handleAutoDismiss();
      }, cue.duration * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [isVisible, cue.duration, cue.isRequired]);

  // Load media when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadMedia();
      // Announce transition cue to screen readers
      const announcement = `Transition cue: ${cue.text || 'Visual transition cue'}`;
      announceToScreenReader(announcement);
      
      // Focus the main container for keyboard accessibility
      setTimeout(() => focusElement('[role="dialog"]'), 100);
    }
  }, [isVisible, cue.text, announceToScreenReader, focusElement]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadMedia = async () => {
    if (cue.type === 'audio' || cue.type === 'mixed') {
      if (cue.audioUrl) {
        setMediaState(prev => ({ ...prev, isLoading: true, error: null }));
        
        try {
          audioRef.current = new Audio(cue.audioUrl);
          audioRef.current.addEventListener('canplaythrough', handleAudioLoaded);
          audioRef.current.addEventListener('error', handleAudioError);
          audioRef.current.load();
        } catch (error) {
          handleAudioError();
        }
      }
    } else {
      setMediaState(prev => ({ ...prev, loaded: true }));
    }
  };

  const handleAudioLoaded = () => {
    setMediaState(prev => ({ ...prev, isLoading: false, loaded: true }));
    
    // Auto-play audio if it's part of the cue
    if (audioRef.current && (cue.type === 'audio' || cue.type === 'mixed')) {
      audioRef.current.play().catch(error => {
        console.warn('Audio autoplay prevented:', error);
      });
    }
  };

  const handleAudioError = () => {
    setMediaState(prev => ({ 
      ...prev, 
      isLoading: false, 
      error: 'Failed to load audio cue',
      loaded: false 
    }));
  };

  const handleAutoDismiss = useCallback(() => {
    if (!cue.isRequired) {
      onDismiss();
      onComplete();
    }
  }, [cue.isRequired, onDismiss, onComplete]);

  const handleUserDismiss = () => {
    if (cue.isRequired && !isAcknowledged) {
      return; // Require acknowledgment for required cues
    }
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    onDismiss();
    onComplete();
  };

  const handleAcknowledge = () => {
    setIsAcknowledged(true);
    if (cue.isRequired) {
      // For required cues, acknowledgment allows dismissal
      handleUserDismiss();
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn('Audio play failed:', error);
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  const getCueStyles = () => {
    const baseStyles = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm';
    return `${baseStyles} ${className}`;
  };

  const getContentStyles = () => {
    return 'bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 text-center transform transition-all duration-300 scale-100';
  };

  const renderVisualContent = () => {
    if (cue.type === 'visual' || cue.type === 'mixed') {
      if (cue.visualUrl) {
        const isVideo = cue.visualUrl.includes('.mp4') || cue.visualUrl.includes('.webm');
        const isGif = cue.visualUrl.includes('.gif');
        
        if (isVideo) {
          return (
            <video
              src={cue.visualUrl}
              autoPlay
              loop
              muted
              className="w-full max-w-xs rounded-lg mb-4"
              aria-label="Transition visual cue"
            />
          );
        } else {
          return (
            <img
              src={cue.visualUrl}
              alt="Transition visual cue"
              className="w-full max-w-xs rounded-lg mb-4"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          );
        }
      }
    }
    return null;
  };

  const renderAudioControls = () => {
    if ((cue.type === 'audio' || cue.type === 'mixed') && cue.audioUrl) {
      return (
        <div className="flex justify-center mb-4">
          <button
            onClick={playAudio}
            disabled={!mediaState.loaded}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Play audio cue"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1l4 4 4-4h1m-4-4v8" />
            </svg>
            <span>Play Audio</span>
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className={`${getCueStyles()} ${getAccessibilityClasses()}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-cue-title"
      aria-describedby="transition-cue-description"
      onKeyDown={(e) => handleKeyboardNavigation(e.nativeEvent, 'step')}
    >
      <div className={getContentStyles()}>
        {/* Loading State */}
        {mediaState.isLoading && (
          <div className="mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading transition cue...</p>
          </div>
        )}

        {/* Error State */}
        {mediaState.error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">{mediaState.error}</p>
          </div>
        )}

        {/* Visual Content */}
        {renderVisualContent()}

        {/* Text Content */}
        {cue.text && (
          <div className="mb-6">
            <h2 id="transition-cue-title" className="text-xl font-semibold text-gray-800 mb-2">
              Transition
            </h2>
            <p id="transition-cue-description" className="text-gray-600 leading-relaxed">
              {cue.text}
            </p>
          </div>
        )}

        {/* Audio Controls */}
        {renderAudioControls()}

        {/* Auto-dismiss Timer */}
        {timeRemaining !== null && !cue.isRequired && (
          <div className="mb-4 text-sm text-gray-500">
            Auto-dismiss in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-3" role="group" aria-label="Transition cue actions">
          {cue.isRequired ? (
            <>
              {!isAcknowledged ? (
                <button
                  onClick={handleAcknowledge}
                  className={`px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${getAccessibilityClasses()}`}
                  aria-label="Acknowledge transition cue"
                  onFocus={() => announceToScreenReader('Acknowledge button focused')}
                >
                  I Understand
                </button>
              ) : (
                <button
                  onClick={handleUserDismiss}
                  className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${getAccessibilityClasses()}`}
                  aria-label="Continue to next step"
                  onFocus={() => announceToScreenReader('Continue button focused')}
                  autoFocus
                >
                  Continue
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleUserDismiss}
              className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${getAccessibilityClasses()}`}
              aria-label="Dismiss transition cue"
              onFocus={() => announceToScreenReader('Continue button focused')}
              autoFocus
            >
              Continue
            </button>
          )}
        </div>

        {/* Accessibility Information */}
        <div className="mt-4 text-xs text-gray-500">
          <p>Press Escape to dismiss {cue.isRequired ? '(after acknowledging)' : ''}</p>
        </div>
      </div>
    </div>
  );
};

export default TransitionCue;