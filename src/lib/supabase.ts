import { createClient, SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { UserProfile, Chat, Message, Memory } from '../types';

// Read config from Vite client env or localStorage overrides (from Settings)
export const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || '';
  const envAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('buddy_supabase_url') || '' : '';
  const storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem('buddy_supabase_anon_key') || '' : '';

  const url = (storedUrl || envUrl).trim();
  const anonKey = (storedAnonKey || envAnonKey).trim();

  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
};

export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

export const getSupabaseConfigDetails = () => {
  return getSupabaseConfig();
};

// ==============================================================================
// AUTHENTICATION HELPERS
// ==============================================================================

export async function supabaseSignUp(
  email: string,
  pass: string,
  meta?: { name: string; grade?: string; goals?: string }
): Promise<{ user: SupabaseUser | null; session: Session | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { user: null, session: null, error: 'Supabase is not configured' };

  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          name: meta?.name || 'Student',
          grade: meta?.grade || 'High School',
          goals: meta?.goals || '',
        },
      },
    });

    if (error) return { user: null, session: null, error: error.message };
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err.message || 'Failed to sign up' };
  }
}

export async function supabaseSignIn(
  email: string,
  pass: string
): Promise<{ user: SupabaseUser | null; session: Session | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { user: null, session: null, error: 'Supabase is not configured' };

  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) return { user: null, session: null, error: error.message };
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err.message || 'Failed to sign in' };
  }
}

export async function supabaseSignOut(): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: null };

  try {
    const { error } = await sb.auth.signOut();
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function supabaseSignInWithGoogle(): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase is not configured' };

  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function supabaseGetSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data } = await sb.auth.getSession();
    return data.session;
  } catch (err) {
    console.error('Error fetching Supabase session:', err);
    return null;
  }
}

export function supabaseOnAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const sb = getSupabase();
  if (!sb) return () => {};

  const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

// ==============================================================================
// DATABASE SYNC HELPERS (Remote persistence)
// ==============================================================================

export async function supabaseSyncProfile(user: UserProfile): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb.from('users').upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      grade: user.grade,
      goals: user.goals,
      favorite_subjects: user.favorite_subjects,
      interests: user.interests,
      streak_days: user.streak_days,
      longest_streak: user.longest_streak,
      total_study_minutes: user.total_study_minutes,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('Supabase sync profile notice:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase profile sync error:', e);
    return false;
  }
}

type RemoteIdMap = {
  chats: Record<string, string>;
  messages: Record<string, string>;
  memories: Record<string, string>;
};

function createRemoteId(): string {
  return crypto.randomUUID();
}

function getRemoteIdMap(userId: string): RemoteIdMap {
  const key = `buddy_supabase_ids_${userId}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as RemoteIdMap;
  } catch (error) {
    console.warn('Supabase remote ID map could not be read:', error);
  }
  return { chats: {}, messages: {}, memories: {} };
}

function saveRemoteIdMap(userId: string, idMap: RemoteIdMap) {
  localStorage.setItem(`buddy_supabase_ids_${userId}`, JSON.stringify(idMap));
}

export async function supabaseSyncWorkspace(
  user: UserProfile,
  chats: Chat[],
  memories: Memory[]
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !user.id || user.id.startsWith('usr_')) return false;

  const idMap = getRemoteIdMap(user.id);
  const profileSynced = await supabaseSyncProfile(user);
  if (!profileSynced) return false;

  try {
    for (const chat of chats) {
      const remoteChatId = idMap.chats[chat.id] || createRemoteId();
      idMap.chats[chat.id] = remoteChatId;

      const { error: chatError } = await sb.from('chats').upsert({
        id: remoteChatId,
        user_id: user.id,
        title: chat.title,
        mode: chat.mode,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      });
      if (chatError) throw chatError;

      const localMessages = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem(`buddy_messages_${chat.id}`) || '[]') as Message[]
        : [];

      for (const message of localMessages) {
        const remoteMessageId = idMap.messages[message.id] || createRemoteId();
        idMap.messages[message.id] = remoteMessageId;
        const { error: messageError } = await sb.from('messages').upsert({
          id: remoteMessageId,
          chat_id: remoteChatId,
          role: message.role,
          content: message.content,
          detected_mode: message.detected_mode,
          sources: message.sources || null,
          attachment: message.attachment || null,
          feedback: message.feedback || null,
          created_at: message.created_at,
        });
        if (messageError) throw messageError;
      }
    }

    for (const memory of memories) {
      const remoteMemoryId = idMap.memories[memory.id] || createRemoteId();
      idMap.memories[memory.id] = remoteMemoryId;
      const { error: memoryError } = await sb.from('memories').upsert({
        id: remoteMemoryId,
        user_id: user.id,
        memory: memory.memory,
        importance: memory.importance,
        category: memory.category,
        created_at: memory.created_at,
      });
      if (memoryError) throw memoryError;
    }

    saveRemoteIdMap(user.id, idMap);
    return true;
  } catch (error) {
    console.warn('Supabase workspace sync notice:', error);
    return false;
  }
}
