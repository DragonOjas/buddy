export type Mode = 
  | 'auto'
  | 'friend'
  | 'homework'
  | 'teacher'
  | 'coding'
  | 'python'
  | 'exam_prep'
  | 'search';

export type MemoryCategory = 
  | 'goal'
  | 'interest'
  | 'academic'
  | 'project'
  | 'preference'
  | 'general';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  grade: string;
  goals: string;
  favorite_subjects: string;
  interests: string;
  streak_days: number;
  longest_streak: number;
  total_study_minutes: number;
  total_messages: number;
  created_at: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // base64 data url
  extractedText?: string;
}

export interface SearchSource {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  detected_mode?: Mode;
  sources?: SearchSource[];
  feedback?: 'like' | 'dislike';
  attachment?: Attachment;
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  mode: Mode;
  created_at: string;
  updated_at: string;
  messages_count?: number;
}

export interface Memory {
  id: string;
  user_id: string;
  memory: string;
  importance: 1 | 2 | 3 | 4 | 5; // 1 = Temporary, 2 = Useful, 3 = Important, 4 = Long-Term, 5 = Core User Identity
  category: MemoryCategory;
  created_at: string;
}

export interface StudyProgress {
  id: string;
  user_id: string;
  subject: string;
  score: number; // 0-100
  topics_covered: number;
  last_studied: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'study' | 'coding' | 'friendship' | 'streak';
  unlocked: boolean;
  unlocked_at?: string;
  progress: number;
  max_progress: number;
}

export interface DayContribution {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface VoiceSettings {
  voiceInputEnabled: boolean;
  autoReadResponses: boolean;
  speechRate: number; // 0.8 - 1.5
  speechPitch: number; // 0.8 - 1.2
  selectedVoiceURI: string;
  wakeWordEnabled: boolean; // Automatic voice mode when saying "Hey Buddy", "Hello Buddy", etc.
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  topic: string;
  subject: string;
  questions: QuizQuestion[];
}

export interface StudyPlanItem {
  day: string;
  topic: string;
  duration: string;
  tasks: string[];
}
