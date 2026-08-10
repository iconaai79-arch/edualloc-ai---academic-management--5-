/**
 * Android Audio & Speech Helper for SpeechBuddy AI
 * Fixes Android Chrome & WebView silent speech synthesis, audio context lockouts,
 * voice resolution fallbacks, and speech synthesis pause bugs.
 */

// Helper to check if running on Android
export const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || navigator.vendor);
};

// Global reference for keeping Android speech synthesis alive during longer playback
let keepAliveInterval: any = null;

/**
 * Android User Gesture Audio Unlocker
 * Android Chrome blocks Web Audio & SpeechSynthesis until a user gesture occurs.
 */
export const unlockAndroidAudio = () => {
  if (typeof window === 'undefined') return;

  // 1. Resume SpeechSynthesis if paused by Android OS
  if ('speechSynthesis' in window) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    // Force load voices into Android memory
    window.speechSynthesis.getVoices();
  }
};

/**
 * Universal Robust Speech Synthesis Speaker for Android, iOS & Desktop
 */
export const speakSpeechBuddyText = (
  text: string,
  options: {
    lang?: 'en' | 'sw' | string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onBoundary?: (event: any) => void;
  } = {}
) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const synth = window.speechSynthesis;

  // Clear any ongoing keepalive interval
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }

  // Cancel previous speech, then resume synth (fixes Android freeze bug)
  synth.cancel();
  if (synth.paused) {
    synth.resume();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = 1.0;
  utterance.rate = options.rate ?? 0.9;
  utterance.pitch = options.pitch ?? 1.2;

  const targetLang = options.lang === 'sw' ? 'sw-KE' : options.lang || 'en-US';
  utterance.lang = targetLang;

  // Find best matching voice (crucial for Android where exact lang tags like sw-KE might not exist)
  const voices = synth.getVoices();
  if (voices && voices.length > 0) {
    let matchedVoice = voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase());
    
    // Fallback search for Swahili (sw)
    if (!matchedVoice && options.lang === 'sw') {
      matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith('sw'));
    }

    // Fallback search for English (en)
    if (!matchedVoice && (options.lang === 'en' || !options.lang)) {
      matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    }

    // Final fallback to any default voice if no exact match
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  // Callbacks
  utterance.onstart = () => {
    options.onStart?.();
  };

  utterance.onend = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    options.onEnd?.();
  };

  utterance.onerror = (err) => {
    console.warn('SpeechBuddy TTS Warning/Error:', err);
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    options.onEnd?.();
  };

  if (options.onBoundary) {
    utterance.onboundary = options.onBoundary;
  }

  // Android Chrome Keep-Alive fix (prevents 15-second speech cutoff on long sentences)
  keepAliveInterval = setInterval(() => {
    if (!synth.speaking) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    } else {
      synth.pause();
      synth.resume();
    }
  }, 10000);

  // Speak with slight delay for Android audio channel initialization if needed
  setTimeout(() => {
    synth.speak(utterance);
    // Ensure resume is triggered on Android
    if (synth.paused) synth.resume();
  }, isAndroid() ? 50 : 0);
};

// Ensure voices are preloaded when page loads
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
  window.speechSynthesis.getVoices();
}
