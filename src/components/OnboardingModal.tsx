import React, { useState } from 'react';
import { UserProfile } from '../types';
import { storage } from '../lib/storage';
import { Sparkles, Bot, ArrowRight, BookOpen, Target, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (user: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [name, setName] = useState('Alex');
  const [grade, setGrade] = useState('11th Grade (High School)');
  const [goals, setGoals] = useState('Become an AI Software Engineer & score 95%+ in STEM');
  const [favoriteSubjects, setFavoriteSubjects] = useState('Computer Science, Calculus, Physics');
  const [interests, setInterests] = useState('Coding, AI models, Robotics, Sci-Fi novels');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentUser = storage.getUser();
    const updatedUser: UserProfile = {
      ...currentUser,
      name: name.trim() || 'Student',
      grade: grade.trim() || 'High School',
      goals: goals.trim() || 'Learn and grow every day',
      favorite_subjects: favoriteSubjects.trim() || 'STEM',
      interests: interests.trim() || 'Learning new skills',
    };

    storage.saveUser(updatedUser);
    storage.setOnboarded(true);

    // Save initial high-importance memories automatically
    if (goals) {
      storage.addMemory(`Primary goal: ${goals}`, 5, 'goal');
    }
    if (favoriteSubjects) {
      storage.addMemory(`Favorite subjects: ${favoriteSubjects}`, 4, 'academic');
    }
    if (interests) {
      storage.addMemory(`Hobbies and personal interests: ${interests}`, 4, 'interest');
    }
    storage.addMemory(`Current academic level: ${grade}`, 3, 'academic');

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });

    onComplete(updatedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0f1422] border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-950/50 overflow-hidden">
        {/* Banner with Buddy character */}
        <div className="p-6 bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-blue-900/60 border-b border-purple-500/20 text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-blue-500 mx-auto mb-3 p-0.5 shadow-xl shadow-purple-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#0d111b] rounded-2xl flex items-center justify-center">
              <Bot className="w-9 h-9 text-purple-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Meet Buddy! 🤖✨</h2>
          <p className="text-xs text-purple-200 mt-1 max-w-sm mx-auto">
            Your personalized AI Friend, Teacher, Coding Partner, and Study Coach. Let's customize Buddy to your goals!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-left">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <span>What should Buddy call you?</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          {/* Grade / Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Current Grade or Year</span>
            </label>
            <input
              type="text"
              required
              value={grade}
              onChange={e => setGrade(e.target.value)}
              placeholder="e.g. 11th Grade, College Sophomore, Self-Taught"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          {/* Big Goals */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Your Big Academic or Career Goals</span>
            </label>
            <input
              type="text"
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder="e.g. Become an AI Engineer, pass AP Calculus, launch a startup"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          {/* Favorite Subjects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span>Favorite Subjects</span>
              </label>
              <input
                type="text"
                value={favoriteSubjects}
                onChange={e => setFavoriteSubjects(e.target.value)}
                placeholder="e.g. Math, Coding, Physics"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Hobbies & Interests</span>
              </label>
              <input
                type="text"
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="e.g. Gaming, Chess, Guitar, Anime"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              id="complete-onboarding-btn"
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Get Started with Buddy</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
