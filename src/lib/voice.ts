// Clean text from Markdown artifacts before feeding to TTS synthesizer
export const cleanTextForSpeech = (markdown: string): string => {
  if (!markdown) return '';
  let text = markdown;
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, ' [code snippet omitted for audio] ');
  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Remove links
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove bold/italics
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  // Remove blockquotes
  text = text.replace(/^\s*>\s+/gm, '');
  // Clean bullet points and numbering
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  // Clean multiple spaces and newlines
  text = text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  
  return text;
};

// Wake word regex: catches "hey buddy", "hello buddy", "yo buddy", "hi buddy", "ok buddy", "buddy", etc.
export const WAKE_WORD_PATTERNS = [
  /\b(hey|hello|yo|hi|ok|okay|sup|listen|hey\s+there)\s+(buddy|buddie|budy|body|bud)\b/i,
  /^\s*(buddy|buddie|budy|hey\s+bud)\b/i,
];

export interface WakeWordResult {
  detected: boolean;
  wakePhrase?: string;
  queryAfterWakeWord: string;
}

export function detectWakeWord(transcript: string): WakeWordResult {
  const clean = transcript.trim();
  if (!clean) return { detected: false, queryAfterWakeWord: '' };

  // 1. Check prefix wake words: "Hey buddy ...", "Yo buddy ...", "Buddy ..."
  for (const pattern of WAKE_WORD_PATTERNS) {
    const match = clean.match(pattern);
    if (match && match.index !== undefined) {
      const after = clean.slice(match.index + match[0].length).replace(/^[,.?! ]+/, '').trim();
      return {
        detected: true,
        wakePhrase: match[0].trim(),
        queryAfterWakeWord: after,
      };
    }
  }

  // 2. Check suffix wake words: "... hey buddy?", "... buddy"
  const suffixMatch = clean.match(/[, ]+(hey\s+|yo\s+|hello\s+)?(buddy|bud)[.?! ]*$/i);
  if (suffixMatch && suffixMatch.index !== undefined) {
    const before = clean.slice(0, suffixMatch.index).trim();
    if (before.length > 0) {
      return {
        detected: true,
        wakePhrase: suffixMatch[0].trim(),
        queryAfterWakeWord: before,
      };
    }
  }

  return { detected: false, queryAfterWakeWord: '' };
}

export class SpeechManager {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static recognition: any = null;

  public static isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public static isSpeechSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  public static getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public static speak(
    text: string, 
    options: {
      rate?: number;
      pitch?: number;
      voiceURI?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ) {
    if (!this.synth) return;
    this.stopSpeaking();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    if (options.voiceURI) {
      const voices = this.getVoices();
      const match = voices.find(v => v.voiceURI === options.voiceURI);
      if (match) utterance.voice = match;
    } else {
      // Pick a natural sounding English voice if possible
      const voices = this.getVoices();
      const natural = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex'))
      );
      if (natural) utterance.voice = natural;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      options.onError?.(e);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public static stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    if (!this.synth) return false;
    return this.synth.speaking;
  }

  public static startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): () => void {
    if (!this.isSpeechRecognitionSupported()) {
      onError('Speech Recognition is not supported in this browser.');
      return () => {};
    }

    const SpeechRecClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      onResult(text, Boolean(finalTranscript));
    };

    rec.onerror = (event: any) => {
      onError(event.error || 'Speech recognition error');
    };

    rec.onend = () => {
      onEnd();
    };

    try {
      rec.start();
      this.recognition = rec;
    } catch (e: any) {
      onError(e.message || 'Failed to start microphone');
    }

    return () => {
      try {
        rec.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    };
  }

  public static stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
  }
}

/**
 * Background Wake Word Listener
 * Continuously listens in the background for "Hey Buddy", "Hello Buddy", "Yo Buddy", etc.
 */
export class WakeWordManager {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static isPaused: boolean = false;
  private static onDetectedCallback: ((query: string, wakePhrase: string) => void) | null = null;
  private static onStatusChange: ((active: boolean) => void) | null = null;
  private static restartTimer: any = null;

  public static isSupported(): boolean {
    return SpeechManager.isSpeechRecognitionSupported();
  }

  public static start(
    onDetected: (query: string, wakePhrase: string) => void,
    onStatus?: (active: boolean) => void
  ): boolean {
    if (!this.isSupported()) return false;
    
    this.onDetectedCallback = onDetected;
    this.onStatusChange = onStatus || null;
    this.isListening = true;
    this.isPaused = false;

    this.initRecognition();
    return true;
  }

  private static initRecognition() {
    if (!this.isListening || this.isPaused) return;

    try {
      if (this.recognition) {
        try { this.recognition.abort(); } catch (e) {}
      }

      const SpeechRecClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        const check = detectWakeWord(transcript);
        if (check.detected) {
          // Pause listener immediately so it doesn't self-trigger
          this.pause();
          this.onDetectedCallback?.(check.queryAfterWakeWord, check.wakePhrase || 'Hey Buddy');
        }
      };

      rec.onerror = (e: any) => {
        // Silent recovery for background listener
        if (e.error === 'not-allowed') {
          this.stop();
        }
      };

      rec.onend = () => {
        if (this.isListening && !this.isPaused) {
          clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isListening && !this.isPaused) {
              this.initRecognition();
            }
          }, 350);
        }
      };

      rec.start();
      this.recognition = rec;
      this.onStatusChange?.(true);
    } catch (err) {
      console.warn('WakeWordManager start exception:', err);
    }
  }

  public static pause() {
    this.isPaused = true;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    this.onStatusChange?.(false);
  }

  public static resume() {
    if (!this.isListening) return;
    this.isPaused = false;
    this.initRecognition();
  }

  public static stop() {
    this.isListening = false;
    this.isPaused = false;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }
    this.onStatusChange?.(false);
  }

  public static getStatus(): { isListening: boolean; isPaused: boolean } {
    return { isListening: this.isListening, isPaused: this.isPaused };
  }
}

