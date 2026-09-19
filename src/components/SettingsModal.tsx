import React, { useState, useEffect } from 'react';
import { UserProfile, VoiceSettings, Memory } from '../types';
import { storage } from '../lib/storage';
import { SpeechManager } from '../lib/voice';
import { resetSupabaseClient } from '../lib/supabase';
import schemaSql from '../lib/schema.sql?raw';
import {
  X,
  User,
  Volume2,
  Moon,
  Brain,
  Download,
  Trash2,
  Database,
  Check,
  Copy,
  Plus,
  Star,
  ExternalLink,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
  onOpenMemoryVault: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
  onOpenMemoryVault,
}) => {
  const [user, setUser] = useState<UserProfile>(storage.getUser());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(storage.getVoiceSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'memory' | 'database' | 'data'>('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('buddy_supabase_url') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(localStorage.getItem('buddy_supabase_anon_key') || '');
  const [copiedSql, setCopiedSql] = useState(false);

  // Quick memory add in settings
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryImp, setNewMemoryImp] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [memories, setMemories] = useState<Memory[]>(storage.getMemories());

  useEffect(() => {
    if (isOpen) {
      setUser(storage.getUser());
      setVoiceSettings(storage.getVoiceSettings());
      setMemories(storage.getMemories());
      const voices = SpeechManager.getVoices();
      setAvailableVoices(voices);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveUser(user);
    storage.saveVoiceSettings(voiceSettings);

    localStorage.setItem('buddy_supabase_url', supabaseUrl.trim());
    localStorage.setItem('buddy_supabase_anon_key', supabaseAnonKey.trim());
    resetSupabaseClient();

    setSavedSuccess(true);
    onProfileUpdated();
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportChats = () => {
    const chats = storage.getChats();
    const exportData = chats.map(c => ({
      ...c,
      messages: storage.getMessages(c.id),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buddy-chats-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to reset your Buddy profile, chat history, and memories?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    const added = storage.addMemory(newMemoryText.trim(), newMemoryImp, 'general');
    setMemories([added, ...memories]);
    setNewMemoryText('');
  };

  const handleDeleteMemory = (id: string) => {
    storage.deleteMemory(id);
    setMemories(memories.filter(m => m.id !== id));
  };

  const handleCopySqlSchema = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#141a2e]/60">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Settings & Preferences
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Goals
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'voice'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            Voice & Speech
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'memory'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            Memories ({memories.length})
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'database'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Supabase DB
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'data'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Data & Export
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-sm text-slate-300">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Your Name</label>
                <input
                  type="text"
                  value={user.name}
                  onChange={e => setUser({ ...user, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Grade or Level</label>
                <input
                  type="text"
                  value={user.grade}
                  onChange={e => setUser({ ...user, grade: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Goals & Aspirations</label>
                <textarea
                  rows={2}
                  value={user.goals}
                  onChange={e => setUser({ ...user, goals: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Favorite Subjects</label>
                  <input
                    type="text"
                    value={user.favorite_subjects}
                    onChange={e => setUser({ ...user, favorite_subjects: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Interests & Hobbies</label>
                  <input
                    type="text"
                    value={user.interests}
                    onChange={e => setUser({ ...user, interests: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
                <span>{savedSuccess ? 'Changes Saved!' : 'Save Profile Details'}</span>
              </button>
            </form>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="font-medium text-white text-sm flex items-center gap-2">
                    <span>Hands-Free Wake Word ("Hey Buddy")</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Automatically opens the Live Voice window when you say "Hey Buddy", "Hello Buddy", or "Yo Buddy"
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={voiceSettings.wakeWordEnabled}
                  onChange={e => {
                    const updated = { ...voiceSettings, wakeWordEnabled: e.target.checked };
                    setVoiceSettings(updated);
                    storage.saveVoiceSettings(updated);
                  }}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="font-medium text-white text-sm">Voice Input (Microphone)</div>
                  <div className="text-xs text-slate-400">Speak your queries using Web Speech Recognition</div>
                </div>
                <input
                  type="checkbox"
                  checked={voiceSettings.voiceInputEnabled}
                  onChange={e => {
                    const updated = { ...voiceSettings, voiceInputEnabled: e.target.checked };
                    setVoiceSettings(updated);
                    storage.saveVoiceSettings(updated);
                  }}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="font-medium text-white text-sm">Auto-Read AI Responses</div>
                  <div className="text-xs text-slate-400">Buddy speaks aloud answers automatically via Text-to-Speech</div>
                </div>
                <input
                  type="checkbox"
                  checked={voiceSettings.autoReadResponses}
                  onChange={e => {
                    const updated = { ...voiceSettings, autoReadResponses: e.target.checked };
                    setVoiceSettings(updated);
                    storage.saveVoiceSettings(updated);
                  }}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Synthesizer Voice</label>
                <select
                  value={voiceSettings.selectedVoiceURI}
                  onChange={e => {
                    const updated = { ...voiceSettings, selectedVoiceURI: e.target.value };
                    setVoiceSettings(updated);
                    storage.saveVoiceSettings(updated);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value="">Default English Voice</option>
                  {availableVoices.map((v, idx) => (
                    <option key={`${v.voiceURI || v.name}-${idx}`} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>Speech Rate</span>
                  <span>{voiceSettings.speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={voiceSettings.speechRate}
                  onChange={e => {
                    const updated = { ...voiceSettings, speechRate: parseFloat(e.target.value) };
                    setVoiceSettings(updated);
                    storage.saveVoiceSettings(updated);
                  }}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => SpeechManager.speak("Hey there! I'm Buddy. I'm ready to learn and solve problems together!", {
                  rate: voiceSettings.speechRate,
                  voiceURI: voiceSettings.selectedVoiceURI,
                })}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium transition-colors"
              >
                Test Voice Playback
              </button>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-xs text-purple-200">
                Buddy continuously remembers facts, milestones, and goals from your conversations to personalize future advice.
              </div>

              {/* Add Memory Form */}
              <form onSubmit={handleAddMemory} className="flex gap-2">
                <input
                  type="text"
                  value={newMemoryText}
                  onChange={e => setNewMemoryText(e.target.value)}
                  placeholder="Add a custom memory (e.g. Taking SAT next month)..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <select
                  value={newMemoryImp}
                  onChange={e => setNewMemoryImp(parseInt(e.target.value) as any)}
                  className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-purple-300"
                >
                  <option value={5}>Lvl 5 (Core)</option>
                  <option value={4}>Lvl 4 (Long-term)</option>
                  <option value={3}>Lvl 3 (Important)</option>
                  <option value={2}>Lvl 2 (Useful)</option>
                  <option value={1}>Lvl 1 (Temp)</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Memory List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {memories.map(m => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <div className="text-slate-200">{m.memory}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="text-purple-400 font-medium">Importance: {m.importance}/5</span>
                        <span>•</span>
                        <span>{new Date(m.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl text-xs text-blue-200">
                <p className="font-semibold text-white mb-1">What you need to connect Supabase & Auth:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Project URL:</strong> Found under Project Settings → API (e.g. <code className="text-cyan-300">https://xyz.supabase.co</code>)</li>
                  <li><strong>Anon Public Key:</strong> The public <code className="text-cyan-300">anon</code> key under Project Settings → API</li>
                  <li><strong>Auth Providers:</strong> In Authentication → Providers, enable <em>Email</em> or <em>Google OAuth</em></li>
                  <li><strong>Site URL / Redirects:</strong> Under Auth → URL Configuration, add this app's URL</li>
                  <li><strong>Database Tables:</strong> Copy the SQL Schema below and run it in the Supabase SQL Editor</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  VITE_SUPABASE_URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  VITE_SUPABASE_ANON_KEY
                </label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={e => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopySqlSchema}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Copied!' : 'Copy Database SQL Schema'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold"
                >
                  Save Supabase Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">Export Conversations</div>
                  <div className="text-xs text-slate-400">Download all your chat transcripts, code snippets, and study notes as JSON.</div>
                </div>
                <button
                  onClick={handleExportChats}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
              </div>

              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-red-300 text-sm">Reset Account & Clear Data</div>
                  <div className="text-xs text-red-400/80">Permanently clears your stored local memories, streak logs, and chat sessions.</div>
                </div>
                <button
                  onClick={handleClearAllData}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
