import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Chat,
  Message,
  Mode,
  StudyProgress,
  Achievement,
  DayContribution,
  Memory,
  VoiceSettings,
  Attachment,
} from './types';
import { storage } from './lib/storage';
import { SpeechManager, WakeWordManager } from './lib/voice';
import {
  supabaseGetSession,
  supabaseOnAuthStateChange,
  supabaseSignOut,
  supabaseSyncProfile,
  supabaseSyncWorkspace,
  isSupabaseConfigured,
} from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { DashboardView } from './components/DashboardView';
import { MemoryVaultView } from './components/MemoryVaultView';
import { SettingsModal } from './components/SettingsModal';
import { QuizModal } from './components/QuizModal';
import { OnboardingModal } from './components/OnboardingModal';
import { VoiceCallModal } from './components/VoiceCallModal';
import { AuthModal } from './components/AuthModal';

const GUEST_TRIAL_LIMIT = 3;

export default function App() {
  // App state
  const [user, setUser] = useState<UserProfile>(storage.getUser());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(storage.getVoiceSettings());
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<Mode>('auto');
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard' | 'memory_vault'>('chat');
  const [isStreaming, setIsStreaming] = useState(false);

  // Authentication & Guest Trial state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('buddy_auth_status') === 'authenticated';
  });
  const [guestMessageCount, setGuestMessageCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('buddy_guest_msg_count') || '0', 10);
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTriggerReason, setAuthTriggerReason] = useState<string | undefined>(undefined);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signup');

  // Gamification & Data state
  const [studyProgress, setStudyProgress] = useState<StudyProgress[]>(storage.getStudyProgress());
  const [achievements, setAchievements] = useState<Achievement[]>(storage.getAchievements());
  const [contributions, setContributions] = useState<DayContribution[]>(storage.getContributions());
  const [memories, setMemories] = useState<Memory[]>(storage.getMemories());

  // Modals & UI (No forced onboarding on initial load so user can directly start chatting)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizTopic, setQuizTopic] = useState('AP Calculus: Derivatives & Tangent Lines');
  const [quizSubject, setQuizSubject] = useState('Calculus');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Hands-Free Live Voice Call State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceInitialQuery, setVoiceInitialQuery] = useState('');
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);

  // Initialize Supabase Auth Session listener
  useEffect(() => {
    const initAuth = async () => {
      const session = await supabaseGetSession();
      if (session && session.user) {
        setIsAuthenticated(true);
        localStorage.setItem('buddy_auth_status', 'authenticated');
      }
    };
    initAuth();

    const unsubscribe = supabaseOnAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('buddy_auth_status', 'authenticated');
        const updated = storage.getUser();
        updated.email = session.user.email || updated.email;
        if (session.user.user_metadata?.name) {
          updated.name = session.user.user_metadata.name;
        }
        setUser(updated);
        storage.saveUser(updated);
        supabaseSyncProfile(updated);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.removeItem('buddy_auth_status');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Keep the local cache responsive while syncing settled authenticated changes to Supabase.
  useEffect(() => {
    if (!isAuthenticated || isStreaming || chats.length === 0) return;

    const syncTimer = window.setTimeout(() => {
      void supabaseSyncWorkspace(user, chats, memories);
    }, 700);

    return () => window.clearTimeout(syncTimer);
  }, [isAuthenticated, isStreaming, user, chats, memories]);

  // Initialize Wake Word Listener ("Hey Buddy", "Hello Buddy", "Yo Buddy")
  useEffect(() => {
    if (voiceSettings.wakeWordEnabled && WakeWordManager.isSupported()) {
      WakeWordManager.start(
        (query) => {
          if (!isAuthenticated && guestMessageCount >= GUEST_TRIAL_LIMIT) {
            setAuthTriggerReason('Sign up to unlock Hands-Free Voice Calls!');
            setAuthInitialMode('signup');
            setIsAuthModalOpen(true);
            return;
          }
          setVoiceInitialQuery(query);
          setIsVoiceModalOpen(true);
        },
        (active) => {
          setIsWakeWordActive(active);
        }
      );
    } else {
      WakeWordManager.stop();
      setIsWakeWordActive(false);
    }

    return () => {
      WakeWordManager.stop();
    };
  }, [voiceSettings.wakeWordEnabled, isAuthenticated, guestMessageCount]);

  // Initialize chats on first mount
  useEffect(() => {
    let savedChats = storage.getChats();
    if (savedChats.length === 0) {
      // Create initial welcoming chat
      const welcomeChat = storage.createChat('Welcome to Buddy! 🤖', 'auto');
      savedChats = [welcomeChat];
      storage.addMessage(
        welcomeChat.id,
        'assistant',
        `Hey there! 👋 I'm **Buddy**, your personal AI friend, teacher, homework helper, coding partner, and study coach.\n\nAsk me anything to get started:\n- 📐 *"Help me solve this calculus derivative step-by-step"*\n- 💻 *"Debug my Python function or explain React hooks"*\n- 🎯 *"Create a 5-day study plan for physics finals"*\n- 🎙️ *"Talk to me about life balance and exam stress"*\n\nWhat are you working on today?`,
        'friend'
      );
    }

    setChats(savedChats);
    const activeId = savedChats[0].id;
    setCurrentChatId(activeId);
    setMessages(storage.getMessages(activeId));
    setCurrentMode(savedChats[0].mode || 'auto');
  }, []);

  // Update current messages when active chat changes
  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setCurrentView('chat');
    setMessages(storage.getMessages(chatId));
    const targetChat = chats.find(c => c.id === chatId);
    if (targetChat) {
      setCurrentMode(targetChat.mode);
    }
  };

  const handleNewChat = (mode: Mode = 'auto') => {
    const title =
      mode === 'friend'
        ? 'Friendly Catch-Up'
        : mode === 'coding'
        ? 'Coding Session'
        : mode === 'homework'
        ? 'Homework Help'
        : mode === 'exam_prep'
        ? 'Exam Revision'
        : 'New Chat';

    const newChat = storage.createChat(title, mode);
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    setCurrentMode(mode);
    setCurrentView('chat');
    setMessages([]);
  };

  const handleDeleteChat = (chatId: string) => {
    storage.deleteChat(chatId);
    const remaining = chats.filter(c => c.id !== chatId);
    setChats(remaining);

    if (currentChatId === chatId) {
      if (remaining.length > 0) {
        handleSelectChat(remaining[0].id);
      } else {
        handleNewChat('auto');
      }
    }
  };

  const handleChangeMode = (mode: Mode) => {
    setCurrentMode(mode);
    if (currentChatId) {
      const updatedChats = chats.map(c => (c.id === currentChatId ? { ...c, mode } : c));
      setChats(updatedChats);
      storage.saveChats(updatedChats);
    }
  };

  // Auth gate helper for protected views/features
  const requireAuth = (featureName: string, action: () => void) => {
    if (!isAuthenticated) {
      setAuthTriggerReason(`Create a free account or sign in to access ${featureName}!`);
      setAuthInitialMode('signup');
      setIsAuthModalOpen(true);
      return;
    }
    action();
  };

  // Streaming Send Message Handler
  const handleSendMessage = async (text: string, attachment?: Attachment, isRegeneration = false) => {
    if (!currentChatId || isStreaming) return;

    // Check Guest Trial limit
    if (!isAuthenticated && !isRegeneration) {
      const nextCount = guestMessageCount + 1;
      setGuestMessageCount(nextCount);
      localStorage.setItem('buddy_guest_msg_count', nextCount.toString());

      if (nextCount > GUEST_TRIAL_LIMIT) {
        setAuthTriggerReason(`You've reached the free trial limit (${GUEST_TRIAL_LIMIT}/${GUEST_TRIAL_LIMIT} messages). Sign up in seconds to continue unlimited AI chats, memory vault, and study coaching!`);
        setAuthInitialMode('signup');
        setIsAuthModalOpen(true);
        return;
      }
    }

    if (!isRegeneration) {
      // 1. Save user message locally
      const userMsg = storage.addMessage(currentChatId, 'user', text, currentMode, attachment);
      setMessages(prev => [...prev, userMsg]);

      // Record streak & heatmap contribution
      storage.recordContribution();
      setContributions(storage.getContributions());
      setUser(storage.getUser());

      // Update chat title if first real exchange
      if (messages.length <= 1) {
        const newTitle = text.slice(0, 32) + (text.length > 32 ? '...' : '');
        const updatedChats = chats.map(c => (c.id === currentChatId ? { ...c, title: newTitle } : c));
        setChats(updatedChats);
        storage.saveChats(updatedChats);
      }
    }

    // 2. Prepare assistant placeholder
    const assistantMsgId = `msg_${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      chat_id: currentChatId,
      role: 'assistant',
      content: '',
      detected_mode: currentMode,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, initialAssistantMsg]);
    setIsStreaming(true);

    try {
      // Build conversation history payload
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Call Express /api/chat/stream
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          mode: currentMode,
          history: chatHistory,
          userProfile: user,
          memories,
          attachment,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let detectedMode = currentMode;
      let citedSources: any[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '').trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.error) {
                accumulatedContent += `\n\n*Error: ${parsed.error}*`;
              } else if (parsed.chunk) {
                accumulatedContent += parsed.chunk;
                if (parsed.mode) detectedMode = parsed.mode;
                if (parsed.sources) citedSources = parsed.sources;

                // Live UI update
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: accumulatedContent,
                          detected_mode: detectedMode,
                          sources: citedSources,
                        }
                      : m
                  )
                );
              }

              // Handle server-side extracted memory
              if (parsed.memory) {
                storage.addMemory(parsed.memory, 4, 'interest');
                setMemories(storage.getMemories());
              }
            } catch (err) {
              // Non-fatal JSON chunk parse
            }
          }
        }
      }

      // Final save to storage
      storage.addMessage(
        currentChatId,
        'assistant',
        accumulatedContent || "I'm right here with you! What else would you like to explore?",
        detectedMode,
        undefined,
        citedSources.length > 0 ? citedSources : undefined
      );

      // Auto-read response if enabled
      if (voiceSettings.autoReadResponses && accumulatedContent) {
        SpeechManager.speak(accumulatedContent, {
          rate: voiceSettings.speechRate,
          voiceURI: voiceSettings.selectedVoiceURI,
        });
      }

      // If user is guest and reached 3 messages, trigger sign up modal gracefully
      if (!isAuthenticated && guestMessageCount + 1 >= GUEST_TRIAL_LIMIT) {
        setTimeout(() => {
          setAuthTriggerReason(`You just completed your ${GUEST_TRIAL_LIMIT} free trial messages! Create your free Buddy account to keep chatting.`);
          setAuthInitialMode('signup');
          setIsAuthModalOpen(true);
        }, 1200);
      }
    } catch (error: any) {
      console.error('Chat stream failed:', error);
      const fallbackContent = `Hey ${user.name}! I'm right here with you. What topic would you like to tackle together?`;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: fallbackContent }
            : m
        )
      );
      storage.addMessage(currentChatId, 'assistant', fallbackContent, currentMode);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleRegenerate = () => {
    if (isStreaming) return;
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      storage.deleteMessage(lastAssistantMsg.id);
      setMessages(prev => prev.filter(m => m.id !== lastAssistantMsg.id));
    }
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachment, true);
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    storage.deleteMessage(msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const handleEditMessage = (msgId: string, newContent: string) => {
    storage.editMessage(msgId, newContent);
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, content: newContent } : m))
    );
  };

  const handleFeedback = (msgId: string, feedback: 'like' | 'dislike') => {
    storage.updateMessageFeedback(msgId, feedback);
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, feedback } : m))
    );
  };

  const handleOpenQuiz = (subject = 'Calculus', topic = 'AP Calculus: Derivatives & Tangent Lines') => {
    setQuizSubject(subject);
    setQuizTopic(topic);
    setIsQuizOpen(true);
  };

  const handleSignOut = async () => {
    await supabaseSignOut();
    setIsAuthenticated(false);
    localStorage.removeItem('buddy_auth_status');
    localStorage.removeItem('buddy_guest_msg_count');
    setGuestMessageCount(0);
  };

  const activeChat = chats.find(c => c.id === currentChatId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080c16] font-sans antialiased text-slate-100 selection:bg-purple-500/30">
      {/* Sidebar Navigation */}
      <Sidebar
        currentChatId={currentChatId}
        chats={chats}
        currentMode={currentMode}
        user={user}
        currentView={currentView}
        isAuthenticated={isAuthenticated}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onChangeMode={handleChangeMode}
        onNavigate={(view) => {
          if (view !== 'chat') {
            requireAuth(view === 'dashboard' ? 'Student Dashboard' : 'Memory Vault', () => {
              setCurrentView(view);
            });
          } else {
            setCurrentView(view);
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQuiz={() => {
          requireAuth('Practice Quizzes', () => {
            handleOpenQuiz();
          });
        }}
        onOpenVoiceCall={() => {
          requireAuth('Live Voice Calls', () => {
            setVoiceInitialQuery('');
            setIsVoiceModalOpen(true);
          });
        }}
        onOpenAuth={() => {
          setAuthTriggerReason(undefined);
          setAuthInitialMode('signup');
          setIsAuthModalOpen(true);
        }}
        onSignOut={handleSignOut}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Guest Banner if not authenticated */}
        {!isAuthenticated && (
          <div className="h-9 px-4 bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-blue-950/80 border-b border-purple-500/20 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-purple-200 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong>Guest Trial:</strong> {Math.min(guestMessageCount, GUEST_TRIAL_LIMIT)}/{GUEST_TRIAL_LIMIT} trial messages used
              </span>
            </div>
            <button
              onClick={() => {
                setAuthTriggerReason(undefined);
                setAuthInitialMode('signup');
                setIsAuthModalOpen(true);
              }}
              className="px-2.5 py-0.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] shadow-sm transition-colors cursor-pointer"
            >
              Sign Up Free
            </button>
          </div>
        )}

        {currentView === 'chat' && (
          <ChatArea
            chatTitle={activeChat?.title || 'Buddy Session'}
            messages={messages}
            currentMode={currentMode}
            user={user}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onRegenerate={handleRegenerate}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            onFeedback={handleFeedback}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onOpenVoiceCall={() => {
              requireAuth('Live Voice Calls', () => {
                setVoiceInitialQuery('');
                setIsVoiceModalOpen(true);
              });
            }}
            onToggleWakeWord={() => {
              const next = !voiceSettings.wakeWordEnabled;
              const updated = { ...voiceSettings, wakeWordEnabled: next };
              setVoiceSettings(updated);
              storage.saveVoiceSettings(updated);
              if (!next) {
                WakeWordManager.stop();
                setIsWakeWordActive(false);
              }
            }}
            isWakeWordActive={isWakeWordActive}
            voiceSettings={voiceSettings}
          />
        )}

        {currentView === 'dashboard' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="h-14 border-b border-slate-800 bg-[#0a0e1a]/80 px-4 flex items-center justify-between lg:hidden shrink-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Sidebar
              </button>
              <span className="font-bold text-sm text-white">Student Dashboard</span>
              <div className="w-6" />
            </header>
            <DashboardView
              user={user}
              studyProgress={studyProgress}
              achievements={achievements}
              contributions={contributions}
              memories={memories}
              recentChats={chats}
              onStartChat={(mode) => {
                handleNewChat(mode || 'auto');
                setCurrentView('chat');
              }}
              onSelectChat={(chatId) => {
                handleSelectChat(chatId);
              }}
              onOpenQuiz={handleOpenQuiz}
            />
          </div>
        )}

        {currentView === 'memory_vault' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="h-14 border-b border-slate-800 bg-[#0a0e1a]/80 px-4 flex items-center justify-between lg:hidden shrink-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Sidebar
              </button>
              <span className="font-bold text-sm text-white">Memory Vault</span>
              <div className="w-6" />
            </header>
            <MemoryVaultView
              memories={memories}
              onMemoriesUpdated={() => setMemories(storage.getMemories())}
            />
          </div>
        )}
      </main>

      {/* Auth Modal (Sign Up, Sign In, Google Auth, Supabase Cloud sync) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authInitialMode}
        triggerReason={authTriggerReason}
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          setIsAuthenticated(true);
          localStorage.setItem('buddy_auth_status', 'authenticated');
          setMemories(storage.getMemories());
          setStudyProgress(storage.getStudyProgress());
          setContributions(storage.getContributions());
          setIsAuthModalOpen(false);
        }}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={(updatedUser) => {
          setUser(updatedUser);
          setIsOnboardingOpen(false);
          setMemories(storage.getMemories());
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onProfileUpdated={() => {
          setUser(storage.getUser());
          setVoiceSettings(storage.getVoiceSettings());
          setMemories(storage.getMemories());
        }}
        onOpenMemoryVault={() => {
          setIsSettingsOpen(false);
          requireAuth('Memory Vault', () => setCurrentView('memory_vault'));
        }}
      />

      {/* Practice Quiz Modal */}
      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        topic={quizTopic}
        subject={quizSubject}
        onQuizComplete={() => {
          setStudyProgress(storage.getStudyProgress());
          setContributions(storage.getContributions());
          setUser(storage.getUser());
        }}
      />

      {/* Hands-Free Live Voice Call Modal */}
      <VoiceCallModal
        isOpen={isVoiceModalOpen}
        onClose={() => {
          setIsVoiceModalOpen(false);
          setVoiceInitialQuery('');
        }}
        user={user}
        voiceSettings={voiceSettings}
        memories={memories}
        initialQuery={voiceInitialQuery}
        onMessageExchanged={(userText, assistantReply) => {
          let targetChatId = currentChatId;
          if (!targetChatId) {
            const newChat = storage.createChat('Voice with Buddy 🎙️', 'friend');
            setChats(storage.getChats());
            setCurrentChatId(newChat.id);
            targetChatId = newChat.id;
          }

          storage.addMessage(targetChatId, 'user', userText, 'friend');
          storage.addMessage(targetChatId, 'assistant', assistantReply, 'friend');
          setMessages(storage.getMessages(targetChatId));
          storage.recordContribution();
          setContributions(storage.getContributions());
          setUser(storage.getUser());
        }}
      />
    </div>
  );
}
