import React, { useState, useRef, useEffect } from 'react';
import { Message, Mode, UserProfile, Attachment, SearchSource, VoiceSettings } from '../types';
import { MarkdownView } from './MarkdownView';
import { SpeechManager } from '../lib/voice';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Trash2,
  Edit2,
  Bot,
  User,
  Sparkles,
  FileText,
  Image as ImageIcon,
  X,
  Globe,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Code2,
  CalendarCheck,
  Search,
  Flame,
  Menu,
} from 'lucide-react';

interface ChatAreaProps {
  chatTitle: string;
  messages: Message[];
  currentMode: Mode;
  user: UserProfile;
  isStreaming: boolean;
  onSendMessage: (text: string, attachment?: Attachment) => void;
  onRegenerate: () => void;
  onDeleteMessage: (msgId: string) => void;
  onEditMessage: (msgId: string, newContent: string) => void;
  onFeedback: (msgId: string, feedback: 'like' | 'dislike') => void;
  onToggleMobileSidebar: () => void;
  onOpenVoiceCall?: () => void;
  onToggleWakeWord?: () => void;
  isWakeWordActive?: boolean;
  voiceSettings: VoiceSettings;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chatTitle,
  messages,
  currentMode,
  user,
  isStreaming,
  onSendMessage,
  onRegenerate,
  onDeleteMessage,
  onEditMessage,
  onFeedback,
  onToggleMobileSidebar,
  onOpenVoiceCall,
  onToggleWakeWord,
  isWakeWordActive,
  voiceSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingMsgId, setCurrentlySpeakingMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const stopListeningRef = useRef<(() => void) | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Stop speaking when unmounting
  useEffect(() => {
    return () => {
      SpeechManager.stopSpeaking();
      if (stopListeningRef.current) {
        stopListeningRef.current();
      }
    };
  }, []);

  const handleSend = () => {
    if ((!inputText.trim() && !attachment) || isStreaming) return;
    onSendMessage(inputText.trim(), attachment || undefined);
    setInputText('');
    setAttachment(null);
    setSpeechTranscript('');
    if (isRecording) {
      stopListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice Recognition Controls
  const toggleListening = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!SpeechManager.isSpeechRecognitionSupported()) {
      alert('Speech recognition is not supported in this browser. Please try Google Chrome.');
      return;
    }

    setIsRecording(true);
    const stopFn = SpeechManager.startListening(
      (transcript, isFinal) => {
        setSpeechTranscript(transcript);
        setInputText(transcript);
      },
      (err) => {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
      }
    );
    stopListeningRef.current = stopFn;
  };

  const stopListening = () => {
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    SpeechManager.stopListening();
    setIsRecording(false);
  };

  // Speech Synthesis Controls
  const handleReadAloud = (msg: Message) => {
    if (isSpeaking && currentlySpeakingMsgId === msg.id) {
      SpeechManager.stopSpeaking();
      setIsSpeaking(false);
      setCurrentlySpeakingMsgId(null);
      return;
    }

    setIsSpeaking(true);
    setCurrentlySpeakingMsgId(msg.id);

    SpeechManager.speak(msg.content, {
      rate: voiceSettings.speechRate,
      voiceURI: voiceSettings.selectedVoiceURI,
      onStart: () => {
        setIsSpeaking(true);
        setCurrentlySpeakingMsgId(msg.id);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingMsgId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingMsgId(null);
      },
    });
  };

  const handleStopSpeaking = () => {
    SpeechManager.stopSpeaking();
    setIsSpeaking(false);
    setCurrentlySpeakingMsgId(null);
  };

  // File Upload Handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB. Please upload a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachment({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editContent.trim()) return;
    onEditMessage(msgId, editContent.trim());
    setEditingMsgId(null);
  };

  const getModeBadge = (mode?: Mode) => {
    switch (mode) {
      case 'friend':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1">
            <Bot className="w-3 h-3" /> Friend Mode
          </span>
        );
      case 'homework':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Homework Helper
          </span>
        );
      case 'teacher':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Teacher Mode
          </span>
        );
      case 'coding':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <Code2 className="w-3 h-3" /> Coding Partner
          </span>
        );
      case 'exam_prep':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CalendarCheck className="w-3 h-3" /> Exam Prep
          </span>
        );
      case 'search':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Grounded Search
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Smart Router
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080c16] text-slate-100 overflow-hidden relative">
      {/* Chat Top Bar */}
      <header className="h-14 border-b border-slate-800/80 bg-[#0a0e1a]/80 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <span>{chatTitle}</span>
              {getModeBadge(currentMode)}
            </div>
            <div className="text-[10px] text-purple-300/80">
              Powered by Gemini 3.8 Flash • Natural Voice & Multimodal Tutor
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hands-Free Wake Word Toggle & Stop Button */}
          {onToggleWakeWord && (
            voiceSettings.wakeWordEnabled ? (
              <button
                onClick={onToggleWakeWord}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-300 transition-all group"
                title="Wake word listening is active. Click to stop and turn off microphone."
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse group-hover:bg-rose-400" />
                <span className="group-hover:hidden">"Hey Buddy" Active</span>
                <span className="hidden group-hover:inline">Stop Voice Mode</span>
              </button>
            ) : (
              <button
                onClick={onToggleWakeWord}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all"
                title="Click to turn on 'Hey Buddy' hands-free listening"
              >
                <MicOff className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline">"Hey Buddy" Off</span>
              </button>
            )
          )}

          {/* Live Voice Window Call Button */}
          {onOpenVoiceCall && (
            <button
              onClick={onOpenVoiceCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
              title="Open Voice Call Window"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Talk to Buddy</span>
            </button>
          )}

          {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-semibold animate-pulse"
              title="Stop speaking"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Voice</span>
            </button>
          )}

          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>{user.streak_days}d Streak</span>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isMsgSpeaking = isSpeaking && currentlySpeakingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 sm:gap-4 max-w-4xl mx-auto group ${
                isUser ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div className="shrink-0 mt-0.5">
                {isUser ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-md shadow-purple-600/20">
                    <div className="w-full h-full bg-[#0a0e1a] rounded-[10px] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Message Bubble Container */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Mode Indicator & Timestamp */}
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isUser ? user.name : 'Buddy'}
                  </span>
                  {!isUser && msg.detected_mode && getModeBadge(msg.detected_mode)}
                  <span>•</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Attachment Chip if present */}
                {msg.attachment && (
                  <div className="mb-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-300 max-w-sm">
                    {msg.attachment.type.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                    <span className="truncate flex-1 font-mono text-[11px]">{msg.attachment.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {(msg.attachment.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-md transition-all ${
                    isUser
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-[#0f1422] border border-slate-800/80 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {editingMsgId === msg.id ? (
                    <div className="space-y-2 min-w-[280px]">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 text-xs rounded bg-slate-900 text-white border border-slate-700 focus:outline-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => setEditingMsgId(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-3 py-1 rounded bg-purple-600 text-white font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <MarkdownView content={msg.content} />
                  )}
                </div>

                {/* Grounded Search Sources Citation Card */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 max-w-full text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cited Search Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-cyan-200 border border-slate-700/60 text-[11px] transition-colors"
                        >
                          <span className="truncate max-w-[220px]">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Actions Bar */}
                <div className={`flex items-center gap-1.5 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}>
                  <button
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
                    title="Copy message"
                  >
                    {copiedMsgId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {!isUser && (
                    <>
                      <button
                        onClick={() => handleReadAloud(msg)}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                          isMsgSpeaking ? 'text-purple-400' : 'hover:text-slate-200'
                        }`}
                        title={isMsgSpeaking ? 'Stop voice' : 'Read aloud'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onFeedback(msg.id, 'like')}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                          msg.feedback === 'like' ? 'text-emerald-400' : 'hover:text-slate-200'
                        }`}
                        title="Good answer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onFeedback(msg.id, 'dislike')}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                          msg.feedback === 'dislike' ? 'text-red-400' : 'hover:text-slate-200'
                        }`}
                        title="Needs improvement"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={onRegenerate}
                        className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
                        title="Regenerate answer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {isUser && (
                    <button
                      onClick={() => handleStartEdit(msg)}
                      className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
                      title="Edit message"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    className="p-1 rounded hover:bg-slate-800 hover:text-red-400 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isStreaming && (
          <div className="flex items-start gap-3 max-w-4xl mx-auto animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-[#0a0e1a] rounded-[10px] flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0f1422] border border-slate-800 text-xs text-purple-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-slate-400 ml-1">Buddy is thinking & formulating guidance...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="px-4 py-2 bg-[#0c101d] border-t border-slate-800 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            {attachment.type.startsWith('image/') ? (
              <img
                src={attachment.dataUrl}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-lg border border-purple-500/40"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="font-semibold text-white">{attachment.name}</div>
              <div className="text-[11px] text-slate-400">
                Ready for Buddy to analyze & solve step-by-step
              </div>
            </div>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Voice Recording Status */}
      {isRecording && (
        <div className="px-4 py-2 bg-purple-950/40 border-t border-purple-500/30 flex items-center justify-between max-w-4xl mx-auto w-full animate-pulse">
          <div className="flex items-center gap-2 text-xs text-purple-300 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>Listening... Speak your homework question or coding challenge</span>
          </div>
          <button
            onClick={stopListening}
            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-[#090d18] shrink-0">
        <div className="max-w-4xl mx-auto relative rounded-2xl bg-[#0f1424] border border-slate-800 focus-within:border-purple-500/60 focus-within:ring-1 focus-within:ring-purple-500/40 transition-all shadow-xl">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentMode === 'coding'
                ? 'Ask to debug code, explain algorithms, or write a React/Python solution...'
                : currentMode === 'homework'
                ? 'Ask a homework question or upload a photo of your assignment...'
                : currentMode === 'exam_prep'
                ? 'Request a study plan, revision timetable, or weak-area drill...'
                : currentMode === 'search'
                ? 'Search current facts, research discoveries, or find citations...'
                : 'Talk to Buddy (ask anything, share your day, or get homework help)...'
            }
            className="w-full pl-4 pr-28 py-3.5 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none max-h-44 scrollbar-thin"
          />

          {/* Action buttons inside input */}
          <div className="absolute right-2.5 bottom-2 flex items-center gap-1">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <button
              id="chat-upload-file-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Upload homework image or PDF document"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Input Button */}
            <button
              id="chat-voice-input-btn"
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/60'
              }`}
              title={isRecording ? 'Stop voice listening' : 'Start voice speech input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              id="chat-send-btn"
              type="button"
              onClick={handleSend}
              disabled={(!inputText.trim() && !attachment) || isStreaming}
              className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-600/30"
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2 max-w-4xl mx-auto">
          <span>Buddy gives step-by-step guidance. Never cheats for you.</span>
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
