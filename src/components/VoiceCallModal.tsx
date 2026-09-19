import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, VoiceSettings, Memory } from '../types';
import { SpeechManager, WakeWordManager, detectWakeWord } from '../lib/voice';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Bot,
  ShieldCheck,
  Radio,
  Square,
  AlertCircle,
  ExternalLink,
  Send,
  Loader2
} from 'lucide-react';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  voiceSettings: VoiceSettings;
  memories: Memory[];
  initialQuery?: string;
  onMessageExchanged?: (userText: string, assistantReply: string) => void;
}

type CallState = 'waiting_wake_word' | 'listening_query' | 'recording_direct' | 'thinking' | 'speaking' | 'muted';

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  user,
  voiceSettings,
  memories,
  initialQuery = '',
  onMessageExchanged,
}) => {
  const [callState, setCallState] = useState<CallState>('waiting_wake_word');
  const [interimText, setInterimText] = useState('');
  const [lastIgnoredSpeech, setLastIgnoredSpeech] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(true);
  const [requireWakeWord, setRequireWakeWord] = useState(true);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [isDirectRecording, setIsDirectRecording] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const stopListeningRef = useRef<(() => void) | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupCall();
    };
  }, []);

  // When modal opens/closes
  useEffect(() => {
    if (isOpen) {
      WakeWordManager.pause();
      setConversationHistory([]);
      setAssistantReply('');
      setInterimText('');
      setLastIgnoredSpeech('');
      setMicErrorMessage(null);
      setIsMuted(false);
      setIsDirectRecording(false);
      setTypedInput('');

      if (initialQuery && initialQuery.trim()) {
        handleUserSpoken(initialQuery.trim());
      } else {
        const greeting = `Hey ${user.name}! I'm listening. Say "Hey Buddy" followed by your question, or tap to speak!`;
        speakBuddyReply(greeting, true);
      }
    } else {
      cleanupCall();
      if (voiceSettings.wakeWordEnabled) {
        WakeWordManager.resume();
      }
    }
  }, [isOpen]);

  const cleanupCall = () => {
    stopActiveAudio();
    SpeechManager.stopSpeaking();
    cleanupMicOnly();
    stopDirectMediaRecording();
    clearTimeout(silenceTimerRef.current);
    isProcessingRef.current = false;
  };

  const stopActiveAudio = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }
  };

  const cleanupMicOnly = () => {
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    clearTimeout(silenceTimerRef.current);
  };

  const stopDirectMediaRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    setIsDirectRecording(false);
  };

  // Start continuous mic listener with strict wake-word filtering
  const startMic = (overrideWakeWord = false) => {
    if (!isOpen || isMuted || isProcessingRef.current) return;

    cleanupMicOnly();
    setMicErrorMessage(null);
    setCallState(requireWakeWord && !overrideWakeWord ? 'waiting_wake_word' : 'listening_query');
    setInterimText('');

    const stopFn = SpeechManager.startListening(
      (text, isFinal) => {
        if (!isMountedRef.current || isProcessingRef.current) return;
        setInterimText(text);
        clearTimeout(silenceTimerRef.current);

        const shouldFilter = requireWakeWord && !overrideWakeWord;

        if (shouldFilter) {
          // STRICT WAKE WORD MODE: Only respond if user explicitly says "Hey Buddy", "Hello Buddy", "Yo Buddy", etc.
          const check = detectWakeWord(text);

          if (check.detected) {
            setLastIgnoredSpeech('');
            setCallState('listening_query');

            if (check.queryAfterWakeWord && check.queryAfterWakeWord.length > 2) {
              silenceTimerRef.current = setTimeout(() => {
                if (!isProcessingRef.current) {
                  handleUserSpoken(check.queryAfterWakeWord);
                }
              }, isFinal ? 400 : 900);
            } else if (isFinal) {
              silenceTimerRef.current = setTimeout(() => {
                if (!isProcessingRef.current) {
                  speakBuddyReply(`Hey ${user.name}! What's on your mind?`);
                }
              }, 400);
            }
          } else {
            // Ignored room chatter
            setLastIgnoredSpeech(text);
          }
        } else {
          // Direct speech mode
          if (isFinal) {
            silenceTimerRef.current = setTimeout(() => {
              if (text.trim() && !isProcessingRef.current) {
                handleUserSpoken(text.trim());
              }
            }, 600);
          } else {
            silenceTimerRef.current = setTimeout(() => {
              if (text.trim().length > 3 && !isProcessingRef.current) {
                handleUserSpoken(text.trim());
              }
            }, 1200);
          }
        }
      },
      (err) => {
        console.warn('Voice modal speech recognition notice:', err);
        if (err.includes('not-allowed') || err.includes('service-not-allowed')) {
          setMicErrorMessage('Microphone access denied. Tap the mic button below to record directly.');
        } else if (err.includes('network')) {
          setMicErrorMessage('Browser speech recognition network issue. Tap the mic button below to talk directly.');
        }
      },
      () => {
        if (isMountedRef.current && isOpen && !isProcessingRef.current && !isMuted) {
          // Delay restart to avoid tight loops if browser disconnects
          setTimeout(() => {
            if (isMountedRef.current && !isProcessingRef.current && !SpeechManager.isSpeaking() && !currentAudioRef.current && !micErrorMessage) {
              startMic(overrideWakeWord);
            }
          }, 800);
        }
      }
    );

    stopListeningRef.current = stopFn;
  };

  // Direct Audio Recording via MediaRecorder + Server-Side Gemini Transcribe
  // (Works 100% reliably in all browsers, iframes, and mobile devices)
  const startDirectAudioRecord = async () => {
    stopActiveAudio();
    SpeechManager.stopSpeaking();
    cleanupMicOnly();
    setMicErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        
        if (audioBlob.size < 500) {
          startMic();
          return;
        }

        setCallState('thinking');
        setInterimText('Transcribing your voice...');

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            const res = await fetch('/api/voice/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64data,
                mimeType: recorder.mimeType || 'audio/webm'
              })
            });
            if (!res.ok) {
              throw new Error(`Transcription API returned ${res.status}`);
            }
            const data = await res.json();
            const transcribed = data.transcript?.trim();
            if (transcribed) {
              // If transcribed successfully, pass to Buddy!
              const wakeCheck = detectWakeWord(transcribed);
              const question = wakeCheck.detected && wakeCheck.queryAfterWakeWord ? wakeCheck.queryAfterWakeWord : transcribed;
              handleUserSpoken(question);
            } else {
              setInterimText('');
              speakBuddyReply("I couldn't hear any words clearly. Could you tap and try speaking again?");
            }
          } catch (e: any) {
            console.error('Server transcribe error:', e);
            setMicErrorMessage('Cloud transcription is unavailable. Use Chrome speech recognition or type your question below.');
            setInterimText('');
            setCallState('listening_query');
            if (SpeechManager.isSpeechRecognitionSupported()) {
              startMic(true);
            }
          }
        };
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsDirectRecording(true);
      setCallState('recording_direct');
    } catch (err: any) {
      console.error('getUserMedia error:', err);
      setMicErrorMessage('Microphone access denied. Please click the URL bar lock icon to allow microphone, or open in a new tab.');
    }
  };

  const stopDirectAudioRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsDirectRecording(false);
    }
  };

  // Send query to Buddy's voice endpoint and speak answer aloud
  const handleUserSpoken = async (text: string) => {
    if (!text || isProcessingRef.current) return;
    isProcessingRef.current = true;
    cleanupMicOnly();
    stopActiveAudio();

    setInterimText('');
    setLastIgnoredSpeech('');
    setCallState('thinking');

    const updatedHistory = [...conversationHistory, { role: 'user' as const, content: text }];
    setConversationHistory(updatedHistory);

    try {
      const response = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: conversationHistory,
          userProfile: user,
          memories: memories.slice(0, 5),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get voice reply');
      }

      const data = await response.json();
      const replyText = data.reply || "I'm right here with you! Tell me more.";

      setConversationHistory(prev => [...prev, { role: 'assistant' as const, content: replyText }]);
      onMessageExchanged?.(text, replyText);

      // Play server-synthesized voice (ElevenLabs or OpenAI) if available
      if (data.hasServerAudio && data.audioBase64) {
        playServerAudio(data.audioBase64, data.audioMimeType || 'audio/mpeg', replyText);
      } else {
        // Fall back to client SpeechSynthesis
        speakBuddyReply(replyText);
      }
    } catch (err: any) {
      console.error('Voice call error:', err);
      const fallback = `Sorry ${user.name}, I missed that for a moment. Could you say it again?`;
      speakBuddyReply(fallback);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Play realistic server audio stream
  const playServerAudio = (base64: string, mimeType: string, replyText: string) => {
    setAssistantReply(replyText);
    setCallState('speaking');

    if (!voiceVolume) {
      setTimeout(() => {
        if (isMountedRef.current && isOpen && !isMuted) startMic();
      }, 2000);
      return;
    }

    try {
      stopActiveAudio();
      const audio = new Audio(`data:${mimeType};base64,${base64}`);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        if (isMountedRef.current) setCallState('speaking');
      };

      audio.onended = () => {
        if (!isMountedRef.current || !isOpen) return;
        setTimeout(() => {
          if (isMountedRef.current && isOpen && !isMuted) startMic();
        }, 350);
      };

      audio.onerror = () => {
        // Fallback to client browser synthesis
        speakBuddyReply(replyText);
      };

      audio.play().catch(() => {
        speakBuddyReply(replyText);
      });
    } catch (e) {
      speakBuddyReply(replyText);
    }
  };

  // Play Buddy's answer via browser SpeechSynthesis
  const speakBuddyReply = (text: string, isGreeting = false) => {
    setAssistantReply(text);
    setCallState('speaking');

    if (!voiceVolume) {
      setTimeout(() => {
        if (isMountedRef.current && isOpen && !isMuted) startMic();
      }, 2000);
      return;
    }

    if (!SpeechManager.isSpeechSynthesisSupported()) {
      if (isMountedRef.current && isOpen && !isMuted && SpeechManager.isSpeechRecognitionSupported()) {
        startMic();
      }
      return;
    }

    SpeechManager.speak(text, {
      rate: voiceSettings.speechRate || 1.0,
      pitch: voiceSettings.speechPitch || 1.0,
      voiceURI: voiceSettings.selectedVoiceURI,
      onStart: () => {
        if (isMountedRef.current) setCallState('speaking');
      },
      onEnd: () => {
        if (!isMountedRef.current || !isOpen) return;
        setTimeout(() => {
          if (isMountedRef.current && isOpen && !isMuted) startMic();
        }, 350);
      },
      onError: () => {
        if (!isMountedRef.current || !isOpen) return;
        setTimeout(() => {
          if (isMountedRef.current && isOpen && !isMuted) startMic();
        }, 400);
      },
    });
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startMic();
    } else {
      setIsMuted(true);
      cleanupMicOnly();
      stopDirectMediaRecording();
      setCallState('muted');
    }
  };

  const handleInterrupt = () => {
    stopActiveAudio();
    SpeechManager.stopSpeaking();
    cleanupMicOnly();
    isProcessingRef.current = false;
    startMic();
  };

  const handleFullStop = () => {
    cleanupCall();
    onClose();
  };

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim() || isProcessingRef.current) return;
    const text = typedInput.trim();
    setTypedInput('');
    handleUserSpoken(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-[#090d1c] border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.25)] p-6 text-slate-100 flex flex-col items-center overflow-hidden">
        
        {/* Background glow ambiance */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="w-full flex items-center justify-between relative z-10 mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <div className={`w-2.5 h-2.5 rounded-full ${callState === 'waiting_wake_word' ? 'bg-indigo-400' : 'bg-emerald-400'} animate-pulse`} />
              <div className={`absolute w-5 h-5 rounded-full ${callState === 'waiting_wake_word' ? 'bg-indigo-400/20' : 'bg-emerald-400/30'} animate-ping`} />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-indigo-300 uppercase">Voice Mode</span>
              <p className="text-[10px] text-slate-400">
                {requireWakeWord ? 'Filtering for "Hey Buddy"' : 'Direct Microphone'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Open in new tab helper */}
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Open app in a New Tab (bypasses iframe microphone restrictions)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title={showCaptions ? 'Hide Subtitles' : 'Show Subtitles'}
            >
              {showCaptions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setVoiceVolume(!voiceVolume)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title={voiceVolume ? 'Mute Audio' : 'Unmute Audio'}
            >
              {voiceVolume ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>

            <button
              onClick={handleFullStop}
              className="p-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition-colors"
              title="Stop Voice Mode & Close"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mic Error Notice if iframe restrictions occurred */}
        {micErrorMessage && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-1.5 leading-tight">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{micErrorMessage}</span>
            </div>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-bold text-white shrink-0"
            >
              Open New Tab ↗
            </button>
          </div>
        )}

        {/* Wake Word Shield Notice */}
        <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] mb-2 relative z-10">
          <div className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter: <strong>"Hey Buddy"</strong></span>
          </div>
          <button
            onClick={() => {
              const next = !requireWakeWord;
              setRequireWakeWord(next);
              startMic(!next);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
              requireWakeWord
                ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/50'
                : 'bg-amber-600/40 text-amber-200 border border-amber-500/50'
            }`}
          >
            {requireWakeWord ? 'Active' : 'All Speech'}
          </button>
        </div>

        {/* Dynamic Voice Visualizer Sphere */}
        <div className="relative w-36 h-36 my-1 flex items-center justify-center">
          {callState === 'speaking' && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/40 animate-ping opacity-75" />
              <div className="absolute -inset-4 rounded-full border border-indigo-400/30 animate-pulse" />
              <div className="absolute -inset-8 rounded-full bg-purple-600/10 blur-xl animate-pulse" />
            </>
          )}

          {(callState === 'listening_query' || callState === 'recording_direct') && (
            <>
              <div className="absolute inset-2 rounded-full border-2 border-emerald-400/50 animate-pulse" />
              <div className="absolute -inset-3 rounded-full bg-emerald-500/20 blur-lg animate-pulse" />
            </>
          )}

          {callState === 'waiting_wake_word' && (
            <div className="absolute inset-3 rounded-full border border-indigo-500/30 animate-pulse" />
          )}

          {callState === 'thinking' && (
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-400 animate-spin" />
          )}

          {/* Central Orb */}
          <div
            className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 relative z-10 ${
              callState === 'speaking'
                ? 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 scale-105 shadow-purple-500/50'
                : callState === 'listening_query' || callState === 'recording_direct'
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 scale-105 shadow-emerald-500/40'
                : callState === 'waiting_wake_word'
                ? 'bg-gradient-to-tr from-slate-800 via-indigo-950 to-slate-900 border border-indigo-500/40 shadow-indigo-900/30'
                : callState === 'thinking'
                ? 'bg-gradient-to-tr from-indigo-700 via-purple-800 to-slate-800 scale-95 shadow-indigo-500/30'
                : 'bg-slate-800 border border-slate-700'
            }`}
          >
            {callState === 'speaking' && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-6 bg-white rounded-full animate-[bounce_0.6s_infinite]" />
                <span className="w-1.5 h-9 bg-white rounded-full animate-[bounce_0.8s_infinite]" />
                <span className="w-1.5 h-7 bg-white rounded-full animate-[bounce_0.5s_infinite]" />
                <span className="w-1.5 h-10 bg-white rounded-full animate-[bounce_0.9s_infinite]" />
                <span className="w-1.5 h-5 bg-white rounded-full animate-[bounce_0.7s_infinite]" />
              </div>
            )}

            {(callState === 'listening_query' || callState === 'recording_direct') && (
              <div className="flex flex-col items-center gap-1 text-white">
                <Mic className="w-7 h-7 animate-pulse text-emerald-300" />
                <span className="text-[9px] font-bold tracking-wider uppercase text-emerald-200">Listening</span>
              </div>
            )}

            {callState === 'waiting_wake_word' && (
              <div className="flex flex-col items-center gap-0.5 text-indigo-300 text-center px-2">
                <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
                <span className="text-[8px] font-semibold tracking-wider uppercase text-indigo-200">Waiting for</span>
                <span className="text-[10px] font-bold text-white">"Hey Buddy"</span>
              </div>
            )}

            {callState === 'thinking' && (
              <div className="flex flex-col items-center gap-1 text-indigo-200">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="text-[9px] font-semibold tracking-wider uppercase">Thinking</span>
              </div>
            )}

            {callState === 'muted' && (
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <MicOff className="w-6 h-6" />
                <span className="text-[9px] font-semibold uppercase">Mic Muted</span>
              </div>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center my-1.5">
          <p className="text-xs font-semibold text-white">
            {callState === 'speaking' && "Buddy is speaking..."}
            {callState === 'listening_query' && "Buddy is listening to your question..."}
            {callState === 'recording_direct' && "Recording audio directly (release when done)..."}
            {callState === 'waiting_wake_word' && 'Say "Hey Buddy" or tap the record button'}
            {callState === 'thinking' && "Buddy is formulating an answer..."}
            {callState === 'muted' && "Microphone paused"}
          </p>
        </div>

        {/* Subtitles Area */}
        {showCaptions && (
          <div className="w-full mt-1.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs min-h-[65px] flex flex-col justify-center space-y-1 relative z-10">
            {interimText ? (
              <div className="text-emerald-300 italic flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="line-clamp-2">"{interimText}"</span>
              </div>
            ) : lastIgnoredSpeech ? (
              <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span className="line-clamp-1 italic text-slate-400">
                  Ignored room talk: "{lastIgnoredSpeech}" (Say "Hey Buddy" to ask)
                </span>
              </div>
            ) : null}

            {assistantReply && (
              <div className="text-purple-200 flex items-start gap-1.5">
                <Bot className="w-3.5 h-3.5 shrink-0 text-purple-400 mt-0.5" />
                <span className="line-clamp-2">Buddy: "{assistantReply}"</span>
              </div>
            )}

            {!interimText && !lastIgnoredSpeech && !assistantReply && (
              <p className="text-slate-400 text-center italic text-[11px]">
                Say <strong className="text-indigo-300">"Hey Buddy, what is quantum mechanics?"</strong> or use the buttons below.
              </p>
            )}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="w-full mt-3 flex items-center justify-center gap-2.5 relative z-10">
          {callState === 'speaking' ? (
            <button
              onClick={handleInterrupt}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Interrupt</span>
            </button>
          ) : isDirectRecording ? (
            <button
              onClick={stopDirectAudioRecord}
              className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Done Speaking</span>
            </button>
          ) : (
            <button
              onClick={startDirectAudioRecord}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              title="Records audio directly using Gemini transcription"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Tap to Speak</span>
            </button>
          )}

          {/* Mute Mic toggle */}
          <button
            onClick={toggleMute}
            className={`px-3 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isMuted
                ? 'bg-amber-600/30 hover:bg-amber-600 text-amber-200 border border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Stop Voice Mode */}
          <button
            onClick={handleFullStop}
            className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        </div>

        {/* Fallback Text Input inside Modal */}
        <form onSubmit={handleSendTyped} className="w-full mt-3 flex items-center gap-1.5 relative z-10">
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Mic not working? Type question here..."
            className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!typedInput.trim() || isProcessingRef.current}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>

      </div>
    </div>
  );
};
