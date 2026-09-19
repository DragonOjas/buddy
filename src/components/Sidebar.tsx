import React, { useState } from 'react';
import { Chat, Mode, UserProfile } from '../types';
import {
  MessageSquarePlus,
  BookOpen,
  GraduationCap,
  Code2,
  CalendarCheck,
  Search,
  Sparkles,
  Bot,
  Settings,
  Brain,
  LayoutDashboard,
  Trash2,
  Trophy,
  Flame,
  Mic,
  LogIn,
  LogOut,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  currentChatId: string | null;
  chats: Chat[];
  currentMode: Mode;
  user: UserProfile;
  currentView: 'chat' | 'dashboard' | 'memory_vault';
  isAuthenticated: boolean;
  onSelectChat: (id: string) => void;
  onNewChat: (mode?: Mode) => void;
  onDeleteChat: (id: string) => void;
  onChangeMode: (mode: Mode) => void;
  onNavigate: (view: 'chat' | 'dashboard' | 'memory_vault') => void;
  onOpenSettings: () => void;
  onOpenQuiz: () => void;
  onOpenVoiceCall?: () => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentChatId,
  chats,
  currentMode,
  user,
  currentView,
  isAuthenticated,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onChangeMode,
  onNavigate,
  onOpenSettings,
  onOpenQuiz,
  onOpenVoiceCall,
  onOpenAuth,
  onSignOut,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [chatSearch, setChatSearch] = useState('');

  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const modes: Array<{ id: Mode; label: string; icon: any; color: string; desc: string }> = [
    { id: 'auto', label: 'Smart Router', icon: Sparkles, color: 'text-purple-400', desc: 'Auto-detects intent' },
    { id: 'friend', label: 'Friend Mode', icon: Bot, color: 'text-pink-400', desc: 'Empathetic & supportive' },
    { id: 'homework', label: 'Homework Helper', icon: BookOpen, color: 'text-amber-400', desc: 'Step-by-step guidance' },
    { id: 'teacher', label: 'Teacher Mode', icon: GraduationCap, color: 'text-indigo-400', desc: 'Concepts & analogies' },
    { id: 'coding', label: 'Coding Partner', icon: Code2, color: 'text-blue-400', desc: 'Debug, code, review' },
    { id: 'exam_prep', label: 'Exam Prep', icon: CalendarCheck, color: 'text-emerald-400', desc: 'Study plans & mocks' },
    { id: 'search', label: 'Web Search', icon: Search, color: 'text-cyan-400', desc: 'Grounding with citations' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 bg-[#090d16] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0a0e1a] rounded-[10px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-base tracking-tight text-white">
                <span>Buddy</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-purple-300/80 font-medium">
                AI Student Companion
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{user.streak_days}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 space-y-2">
          <button
            id="new-chat-btn"
            onClick={() => {
              onNewChat(currentMode);
              onCloseMobile();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Start New Chat</span>
          </button>

          {onOpenVoiceCall && (
            <button
              onClick={() => {
                onOpenVoiceCall();
                onCloseMobile();
              }}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group"
              title="Open Voice Call Window or say 'Hey Buddy'"
            >
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Talk to Buddy</span>
              </div>
              <div className="flex items-center gap-1">
                {!isAuthenticated && <Lock className="w-3 h-3 text-slate-500" />}
                <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200">
                  "Hey Buddy"
                </span>
              </div>
            </button>
          )}

          {!isAuthenticated && onOpenAuth && (
            <button
              onClick={() => {
                onOpenAuth();
                onCloseMobile();
              }}
              className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-purple-400" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-1 space-y-1 text-xs">
          <button
            onClick={() => {
              onNavigate('dashboard');
              onCloseMobile();
            }}
            className={`w-full px-3 py-2 rounded-lg flex items-center justify-between transition-colors font-semibold ${
              currentView === 'dashboard'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              <span>Student Dashboard</span>
            </div>
            {!isAuthenticated && <Lock className="w-3 h-3 text-slate-500" />}
          </button>

          <button
            onClick={() => {
              onNavigate('memory_vault');
              onCloseMobile();
            }}
            className={`w-full px-3 py-2 rounded-lg flex items-center justify-between transition-colors font-semibold ${
              currentView === 'memory_vault'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Brain className="w-4 h-4 text-pink-400" />
              <span>Memory Vault</span>
            </div>
            {!isAuthenticated && <Lock className="w-3 h-3 text-slate-500" />}
          </button>

          <button
            onClick={() => {
              onOpenQuiz();
              onCloseMobile();
            }}
            className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors font-semibold"
          >
            <div className="flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Practice Quiz</span>
            </div>
            {!isAuthenticated && <Lock className="w-3 h-3 text-slate-500" />}
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-3 pt-3 pb-1 border-t border-slate-800/80">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 px-1">
            Active Mode
          </div>
          <div className="grid grid-cols-1 gap-1">
            {modes.map(m => {
              const Icon = m.icon;
              const isSelected = currentMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onChangeMode(m.id)}
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-white font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  title={m.desc}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${m.color}`} />
                    <span className="truncate">{m.label}</span>
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat History Header & Search */}
        <div className="px-3 pt-3 flex-1 flex flex-col min-h-0 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Recent Chats
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {chats.length}
            </span>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={chatSearch}
              onChange={e => setChatSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Chat List Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {filteredChats.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-slate-500">
                No chats found
              </div>
            ) : (
              filteredChats.map(c => {
                const isActive = currentView === 'chat' && currentChatId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectChat(c.id);
                      onCloseMobile();
                    }}
                    className={`group px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors text-xs ${
                      isActive
                        ? 'bg-purple-950/40 text-purple-200 border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="truncate flex-1 pr-1">
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="text-[10px] text-slate-400 truncate capitalize">
                        {c.mode}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700/60 hover:text-red-400 transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080b13] flex items-center justify-between">
          <div
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 group"
          >
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-purple-500/30 object-cover"
            />
            <div className="truncate">
              <div className="text-xs font-bold text-slate-200 truncate group-hover:text-purple-300 transition-colors">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isAuthenticated ? user.grade : 'Guest Mode'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isAuthenticated && onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
