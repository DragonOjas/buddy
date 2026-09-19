import React, { useState } from 'react';
import { UserProfile, StudyProgress, Achievement, DayContribution, Memory, Chat } from '../types';
import { ContributionHeatmap } from './ContributionHeatmap';
import {
  Flame,
  BookOpen,
  MessageSquare,
  Award,
  CheckCircle,
  Target,
  Brain,
  Sparkles,
  ArrowRight,
  Code2,
  Trophy,
  Compass,
  Mic,
  BarChart3,
  Plus,
  Trash2,
} from 'lucide-react';

interface DashboardViewProps {
  user: UserProfile;
  studyProgress: StudyProgress[];
  achievements: Achievement[];
  contributions: DayContribution[];
  memories: Memory[];
  recentChats: Chat[];
  onStartChat: (mode?: any) => void;
  onSelectChat: (chatId: string) => void;
  onOpenQuiz: (subject?: string, topic?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  studyProgress,
  achievements,
  contributions,
  memories,
  recentChats,
  onStartChat,
  onSelectChat,
  onOpenQuiz,
}) => {
  // Weekly goals loaded from localStorage or user goals
  const [weeklyGoals, setWeeklyGoals] = useState<Array<{ id: string; text: string; completed: boolean }>>(() => {
    try {
      const stored = localStorage.getItem('buddy_weekly_goals');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { id: 'g1', text: 'Complete a practice quiz on your target topic', completed: false },
      { id: 'g2', text: 'Chat with Buddy to clarify a difficult concept', completed: false },
    ];
  });

  const [newGoalInput, setNewGoalInput] = useState('');

  const saveGoals = (goals: Array<{ id: string; text: string; completed: boolean }>) => {
    setWeeklyGoals(goals);
    localStorage.setItem('buddy_weekly_goals', JSON.stringify(goals));
  };

  const toggleGoal = (id: string) => {
    const updated = weeklyGoals.map(g => (g.id === id ? { ...g, completed: !g.completed } : g));
    saveGoals(updated);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    const newG = { id: `g_${Date.now()}`, text: newGoalInput.trim(), completed: false };
    const updated = [...weeklyGoals, newG];
    saveGoals(updated);
    setNewGoalInput('');
  };

  const handleDeleteGoal = (id: string) => {
    const updated = weeklyGoals.filter(g => g.id !== id);
    saveGoals(updated);
  };

  const completedGoalsCount = weeklyGoals.filter(g => g.completed).length;

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Code2':
        return <Code2 className="w-4 h-4 text-blue-400" />;
      case 'Trophy':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'Compass':
        return <Compass className="w-4 h-4 text-emerald-400" />;
      case 'Mic':
        return <Mic className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto text-slate-100">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Welcome back, {user.name || 'Student'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to learn something awesome today?
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {memories.length > 0 ? (
              <>Buddy has saved <strong className="text-purple-300">{memories.length} long-term memories</strong> to personalize your coaching.</>
            ) : (
              <>Buddy is ready to help with homework, code debugging, exam schedules, and personalized study coaching.</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onOpenQuiz('Calculus', 'AP Calculus Review')}
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Practice Quiz</span>
          </button>
          <button
            onClick={() => onStartChat('auto')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat with Buddy</span>
          </button>
        </div>
      </div>

      {/* Contribution Heatmap */}
      <ContributionHeatmap
        contributions={contributions}
        streakDays={user.streak_days || 0}
        longestStreak={user.longest_streak || 0}
      />

      {/* Grid of Study Progress & Weekly Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Mastery / Study Progress */}
        <div className="lg:col-span-2 bg-[#0d1117] border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-base text-white">Study Progress & Subject Mastery</h3>
            </div>
            <span className="text-xs text-slate-400">Tracked via Quizzes & Conversations</span>
          </div>

          {studyProgress.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-white">No Quiz Scores Tracked Yet</div>
              <p className="text-xs text-slate-400 max-w-sm">
                Take a practice quiz on any subject (Math, Coding, Physics, etc.) to start tracking your mastery progress!
              </p>
              <button
                onClick={() => onOpenQuiz('Calculus', 'Derivatives & Integrals')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Take First Practice Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {studyProgress.map(prog => (
                <div key={prog.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-200 mb-1.5">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      {prog.subject}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{prog.topics_covered} topics</span>
                      <span className={`font-bold ${
                        prog.score >= 90 ? 'text-emerald-400' : prog.score >= 80 ? 'text-blue-400' : 'text-amber-400'
                      }`}>
                        {prog.score}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        prog.score >= 90
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : prog.score >= 80
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                      style={{ width: `${prog.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Goals */}
        <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Weekly Goals</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {completedGoalsCount}/{weeklyGoals.length} Done
              </span>
            </div>

            {/* Add Goal Form */}
            <form onSubmit={handleAddGoal} className="flex gap-2 mb-3">
              <input
                type="text"
                value={newGoalInput}
                onChange={e => setNewGoalInput(e.target.value)}
                placeholder="Add a goal (e.g. Finish physics set)..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
                title="Add Goal"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {weeklyGoals.map(goal => (
                <div
                  key={goal.id}
                  className={`p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                    goal.completed
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300 line-through opacity-80'
                      : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div
                    onClick={() => toggleGoal(goal.id)}
                    className="flex items-start gap-2 flex-1 cursor-pointer"
                  >
                    <CheckCircle
                      className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                        goal.completed ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    />
                    <span>{goal.text}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gamification: Achievement Badges */}
      <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Student Achievements</h3>
          </div>
          <span className="text-xs text-slate-400">
            {achievements.filter(a => a.unlocked).length} of {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                ach.unlocked
                  ? 'bg-slate-900/80 border-purple-500/40 shadow-md shadow-purple-900/10'
                  : 'bg-slate-900/30 border-slate-800/60 opacity-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl mb-2 flex items-center justify-center ${
                  ach.unlocked
                    ? 'bg-gradient-to-tr from-purple-600/30 to-blue-500/30 border border-purple-500/40 shadow-inner'
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                {getAchievementIcon(ach.icon)}
              </div>
              <div className="font-bold text-xs text-white truncate max-w-full">{ach.title}</div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                {ach.description}
              </div>
              {ach.unlocked ? (
                <span className="mt-2 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                  Unlocked
                </span>
              ) : (
                <span className="mt-2 text-[9px] text-slate-500">
                  {ach.progress}/{ach.max_progress}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
