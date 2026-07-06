import { useState, useCallback } from 'react';

interface InterruptState {
  isMediaPaused: boolean;
  isListeningForQuery: boolean;
  error: string | null;
}

export const useChimeInInterrupt = (onInterruptTriggered: () => void) => {
  const [state, setState] = useState<InterruptState>({
    isMediaPaused: false,
    isListeningForQuery: false,
    error: null
  });

  const initializeVoiceListener = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState(prev => ({ ...prev, error: "Native Speech Web API uninitialized in target browser shell." }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          if (transcript.includes("chime in")) {
            setState(prev => ({ ...prev, isMediaPaused: true, isListeningForQuery: true }));
            onInterruptTriggered();
          }
        }
      }
    };

    recognition.start();
  }, [onInterruptTriggered]);

  const resumeMediaSequence = () => {
    setState(prev => ({ ...prev, isMediaPaused: false, isListeningForQuery: false }));
  };

  return {
    isMediaPaused: state.isMediaPaused,
    isListeningForQuery: state.isListeningForQuery,
    runtimeError: state.error,
    initializeVoiceListener,
    resumeMediaSequence
  };
};
