-- ==============================================================================
-- BUDDY - AI Student Companion Database Schema for Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  grade TEXT DEFAULT 'High School',
  goals TEXT DEFAULT 'Excel in exams and build cool AI projects',
  favorite_subjects TEXT DEFAULT 'Computer Science, Math',
  interests TEXT DEFAULT 'Coding, Science, Gaming',
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHATS TABLE
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  mode TEXT NOT NULL DEFAULT 'auto', -- 'auto', 'friend', 'homework', 'teacher', 'coding', 'exam_prep', 'search'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  detected_mode TEXT,
  sources JSONB, -- Array of { title, url }
  attachment JSONB, -- { name, type, size, dataUrl }
  feedback TEXT CHECK (feedback IN ('like', 'dislike', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEMORIES TABLE (Long-term Buddy Memory System)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  memory TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  category TEXT DEFAULT 'general' CHECK (category IN ('goal', 'interest', 'academic', 'project', 'preference', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STUDY PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.study_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  topics_covered INTEGER DEFAULT 0,
  last_studied TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONTRIBUTIONS LOG TABLE (For GitHub-like activity heatmap)
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- 7. ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- INDEXES for optimal performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_user_id ON public.study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user_date ON public.contributions(user_id, date);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Make this script safe to rerun while developing the project.
DROP POLICY IF EXISTS "Users can manage own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can manage own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can manage own study progress" ON public.study_progress;
DROP POLICY IF EXISTS "Users can manage own contributions" ON public.contributions;
DROP POLICY IF EXISTS "Users can manage own achievements" ON public.achievements;

-- Allow users to view and update their own data
CREATE POLICY "Users can manage own profile" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own chats" ON public.chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON public.messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid())
);
CREATE POLICY "Users can manage own memories" ON public.memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own study progress" ON public.study_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contributions" ON public.contributions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);
