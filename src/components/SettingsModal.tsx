import React, { useState, useEffect } from 'react';
import { UserProfile, VoiceSettings } from '../types';
import { storage } from '../lib/storage';
import { SpeechManager } from '../lib/voice';
import {
  X,
  User,
  Volume2,
  Check,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [user, setUser] = useState<UserProfile>(storage.getUser());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(storage.getVoiceSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'voice'>('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUser(storage.getUser());
      setVoiceSettings(storage.getVoiceSettings());
      const voices = SpeechManager.getVoices();
      setAvailableVoices(voices);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveUser(user);
    storage.saveVoiceSettings(voiceSettings);

    setSavedSuccess(true);
    onProfileUpdated();
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#141a2e]/60">
          <div>
            <h2 className="text-lg font-bold text-white">Settings & Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">Shape Buddy around the way you learn.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          {/* Vertical Navigation */}
          <nav className="w-full sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-800 bg-[#0b1020] p-3 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full rounded-xl px-3 py-3 text-left transition-colors flex items-center gap-3 ${
              activeTab === 'profile'
                ? 'bg-purple-500/15 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span><strong className="block text-xs">Profile</strong><small className="font-normal text-[10px] opacity-70">Goals and interests</small></span>
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`w-full rounded-xl px-3 py-3 text-left transition-colors flex items-center gap-3 ${
              activeTab === 'voice'
                ? 'bg-purple-500/15 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span><strong className="block text-xs">Voice & Speech</strong><small className="font-normal text-[10px] opacity-70">Talk to Buddy</small></span>
          </button>
          <div className="hidden sm:block mt-auto p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-[10px] text-slate-500 leading-relaxed">
            <Sparkles className="w-4 h-4 text-purple-400 mb-2" />
            Your settings are saved automatically where possible.
          </div>
          </nav>

        {/* Tab Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 flex-1 text-sm text-slate-300">
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

        </div>
      </div>
      </div>
    </div>
  );
};
