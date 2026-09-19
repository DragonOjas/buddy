import { UserProfile, Chat, Message, Memory, StudyProgress, Achievement, DayContribution, Mode, VoiceSettings } from '../types';

const DEFAULT_USER: UserProfile = {
  id: 'usr_student',
  name: 'Student',
  email: '',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BuddyStudent',
  grade: 'High School',
  goals: '',
  favorite_subjects: '',
  interests: '',
  streak_days: 0,
  longest_streak: 0,
  total_study_minutes: 0,
  total_messages: 0,
  created_at: new Date().toISOString(),
};

const DEFAULT_MEMORIES: Memory[] = [];

const DEFAULT_STUDY_PROGRESS: StudyProgress[] = [];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_first_spark',
    title: 'First Spark',
    description: 'Ask Buddy your very first question.',
    icon: 'Sparkles',
    category: 'friendship',
    unlocked: false,
    progress: 0,
    max_progress: 1,
  },
  {
    id: 'ach_streak_7',
    title: 'Study Streak Champion',
    description: 'Maintain a 7-day continuous learning streak.',
    icon: 'Flame',
    category: 'streak',
    unlocked: false,
    progress: 0,
    max_progress: 7,
  },
  {
    id: 'ach_code_ninja',
    title: 'Code Ninja',
    description: 'Debug or write 10 coding solutions with Buddy.',
    icon: 'Code2',
    category: 'coding',
    unlocked: false,
    progress: 0,
    max_progress: 10,
  },
  {
    id: 'ach_quiz_master',
    title: 'Master Mind',
    description: 'Score 100% on any practice quiz.',
    icon: 'Trophy',
    category: 'study',
    unlocked: false,
    progress: 0,
    max_progress: 1,
  },
  {
    id: 'ach_deep_thinker',
    title: 'Curious Scholar',
    description: 'Conduct 5 deep web searches with real-time citations.',
    icon: 'Compass',
    category: 'study',
    unlocked: false,
    progress: 0,
    max_progress: 5,
  },
  {
    id: 'ach_voice_pioneer',
    title: 'Conversationalist',
    description: 'Use voice speech interaction with Buddy.',
    icon: 'Mic',
    category: 'friendship',
    unlocked: false,
    progress: 0,
    max_progress: 1,
  }
];

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceInputEnabled: true,
  autoReadResponses: false,
  speechRate: 1.0,
  speechPitch: 1.0,
  selectedVoiceURI: '',
  wakeWordEnabled: false,
};

// Generate 365 days baseline contributions
export const generateInitialContributions = (): DayContribution[] => {
  const contributions: DayContribution[] = [];
  const today = new Date();
  
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    contributions.push({ date: dateStr, count: 0, level: 0 });
  }

  return contributions;
};

// LocalStorage helpers with automatic JSON deserialization
export const storage = {
  getUser: (): UserProfile => {
    try {
      const stored = localStorage.getItem('buddy_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clear out old mock Alex Rivera profile if present
        if (parsed.id === 'usr_default_student') {
          localStorage.removeItem('buddy_user');
          localStorage.removeItem('buddy_memories');
          localStorage.removeItem('buddy_progress');
          localStorage.removeItem('buddy_contributions');
          localStorage.removeItem('buddy_chats');
          return DEFAULT_USER;
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_USER;
  },

  saveUser: (user: UserProfile) => {
    localStorage.setItem('buddy_user', JSON.stringify(user));
  },

  getChats: (): Chat[] => {
    try {
      const stored = localStorage.getItem('buddy_chats');
      if (stored) {
        const parsed: Chat[] = JSON.parse(stored);
        const filtered = parsed.filter(c => c.user_id !== 'usr_default_student');
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  saveChats: (chats: Chat[]) => {
    localStorage.setItem('buddy_chats', JSON.stringify(chats));
  },

  createChat: (title: string, mode: Mode = 'auto'): Chat => {
    const chats = storage.getChats();
    const newChat: Chat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: storage.getUser().id,
      title,
      mode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages_count: 0,
    };
    const updated = [newChat, ...chats];
    storage.saveChats(updated);
    return newChat;
  },

  deleteChat: (chatId: string) => {
    const chats = storage.getChats().filter(c => c.id !== chatId);
    storage.saveChats(chats);
    localStorage.removeItem(`buddy_messages_${chatId}`);
  },

  getMessages: (chatId: string): Message[] => {
    try {
      const stored = localStorage.getItem(`buddy_messages_${chatId}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  saveMessages: (chatId: string, messages: Message[]) => {
    localStorage.setItem(`buddy_messages_${chatId}`, JSON.stringify(messages));
    
    // Update messages count in chat object
    const chats = storage.getChats().map(c => 
      c.id === chatId ? { ...c, messages_count: messages.length, updated_at: new Date().toISOString() } : c
    );
    storage.saveChats(chats);
  },

  addMessage: (chatId: string, role: 'user' | 'assistant' | 'system', content: string, detected_mode?: Mode, attachment?: any, sources?: any[]): Message => {
    const messages = storage.getMessages(chatId);
    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      chat_id: chatId,
      role,
      content,
      detected_mode,
      attachment,
      sources,
      created_at: new Date().toISOString(),
    };
    
    const updated = [...messages, newMsg];
    storage.saveMessages(chatId, updated);
    
    // Increment total messages in profile
    const user = storage.getUser();
    user.total_messages = (user.total_messages || 0) + 1;
    storage.saveUser(user);

    return newMsg;
  },

  deleteMessage: (msgId: string) => {
    const chats = storage.getChats();
    for (const chat of chats) {
      const msgs = storage.getMessages(chat.id);
      const filtered = msgs.filter(m => m.id !== msgId);
      if (filtered.length !== msgs.length) {
        storage.saveMessages(chat.id, filtered);
        break;
      }
    }
  },

  editMessage: (msgId: string, newContent: string) => {
    const chats = storage.getChats();
    for (const chat of chats) {
      const msgs = storage.getMessages(chat.id);
      const target = msgs.find(m => m.id === msgId);
      if (target) {
        target.content = newContent;
        storage.saveMessages(chat.id, msgs);
        break;
      }
    }
  },

  updateMessageFeedback: (msgId: string, feedback: 'like' | 'dislike') => {
    const chats = storage.getChats();
    for (const chat of chats) {
      const msgs = storage.getMessages(chat.id);
      const target = msgs.find(m => m.id === msgId);
      if (target) {
        target.feedback = feedback;
        storage.saveMessages(chat.id, msgs);
        break;
      }
    }
  },

  getMemories: (): Memory[] => {
    try {
      const stored = localStorage.getItem('buddy_memories');
      if (stored) {
        const parsed: Memory[] = JSON.parse(stored);
        const filtered = parsed.filter(m => m.user_id !== 'usr_default_student');
        return filtered;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_MEMORIES;
  },

  saveMemories: (memories: Memory[]) => {
    localStorage.setItem('buddy_memories', JSON.stringify(memories));
  },

  addMemory: (memoryText: string, importance: 1 | 2 | 3 | 4 | 5 = 3, category: any = 'general'): Memory => {
    const memories = storage.getMemories();
    const newMem: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: storage.getUser().id,
      memory: memoryText,
      importance,
      category,
      created_at: new Date().toISOString(),
    };
    const updated = [newMem, ...memories];
    storage.saveMemories(updated);
    return newMem;
  },

  deleteMemory: (memoryId: string) => {
    const memories = storage.getMemories().filter(m => m.id !== memoryId);
    storage.saveMemories(memories);
  },

  editMemory: (memoryId: string, newText: string, importance?: 1|2|3|4|5) => {
    const memories = storage.getMemories().map(m => 
      m.id === memoryId ? { ...m, memory: newText, importance: importance ?? m.importance } : m
    );
    storage.saveMemories(memories);
  },

  updateMemory: (memoryId: string, newText: string, importance?: 1|2|3|4|5) => {
    storage.editMemory(memoryId, newText, importance);
  },

  getStudyProgress: (): StudyProgress[] => {
    try {
      const stored = localStorage.getItem('buddy_progress');
      if (stored) {
        const parsed: StudyProgress[] = JSON.parse(stored);
        const filtered = parsed.filter(p => p.user_id !== 'usr_default_student');
        return filtered;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STUDY_PROGRESS;
  },

  saveStudyProgress: (progress: StudyProgress[]) => {
    localStorage.setItem('buddy_progress', JSON.stringify(progress));
  },

  getAchievements: (): Achievement[] => {
    try {
      const stored = localStorage.getItem('buddy_achievements');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ACHIEVEMENTS;
  },

  saveAchievements: (achievements: Achievement[]) => {
    localStorage.setItem('buddy_achievements', JSON.stringify(achievements));
  },

  getContributions: (): DayContribution[] => {
    try {
      const stored = localStorage.getItem('buddy_contributions');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    const initial = generateInitialContributions();
    localStorage.setItem('buddy_contributions', JSON.stringify(initial));
    return initial;
  },

  recordContribution: () => {
    const contributions = storage.getContributions();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const existing = contributions.find(c => c.date === todayStr);
    if (existing) {
      existing.count += 1;
      if (existing.count >= 8) existing.level = 4;
      else if (existing.count >= 5) existing.level = 3;
      else if (existing.count >= 3) existing.level = 2;
      else existing.level = 1;
    } else {
      contributions.push({ date: todayStr, count: 1, level: 1 });
    }
    
    localStorage.setItem('buddy_contributions', JSON.stringify(contributions));

    // Update streak
    const user = storage.getUser();
    user.streak_days = Math.max(1, (user.streak_days || 0));
    user.longest_streak = Math.max(user.streak_days, user.longest_streak || 1);
    storage.saveUser(user);
  },

  getVoiceSettings: (): VoiceSettings => {
    try {
      const stored = localStorage.getItem('buddy_voice_settings');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_VOICE_SETTINGS;
  },

  saveVoiceSettings: (settings: VoiceSettings) => {
    localStorage.setItem('buddy_voice_settings', JSON.stringify(settings));
  },

  isOnboarded: (): boolean => {
    return localStorage.getItem('buddy_onboarded') === 'true';
  },

  setOnboarded: (val: boolean = true) => {
    localStorage.setItem('buddy_onboarded', val ? 'true' : 'false');
  }
};
