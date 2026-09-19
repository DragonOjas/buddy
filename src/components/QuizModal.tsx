import React, { useState } from 'react';
import { Quiz, QuizQuestion } from '../types';
import { X, CheckCircle2, AlertCircle, HelpCircle, Trophy, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { storage } from '../lib/storage';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: string;
  subject?: string;
  onQuizComplete?: (score: number) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  topic = 'AP Calculus: Derivatives & Tangent Lines',
  subject = 'Calculus',
  onQuizComplete,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>({
    topic,
    subject,
    questions: [
      {
        id: 'q1',
        question: 'What is the derivative of f(x) = x³ - 4x² + 7x - 2 with respect to x?',
        options: [
          '3x² - 8x + 7',
          '3x² - 4x + 7',
          'x² - 8x + 7',
          '3x³ - 8x² + 7',
        ],
        correctIndex: 0,
        explanation: 'Applying the power rule d/dx(x^n) = n*x^(n-1) to each term gives: 3x² - 2(4)x + 7 = 3x² - 8x + 7.',
      },
      {
        id: 'q2',
        question: 'If f(x) = sin(2x), what is f\'(x) using the Chain Rule?',
        options: [
          'cos(2x)',
          '2cos(2x)',
          '-2cos(2x)',
          '2sin(2x)',
        ],
        correctIndex: 1,
        explanation: 'By the Chain Rule, d/dx[sin(u)] = cos(u) * du/dx. Here u = 2x, so du/dx = 2. Thus 2cos(2x).',
      },
      {
        id: 'q3',
        question: 'What does a derivative equal to zero (f\'(c) = 0) typically indicate about the function f(x)?',
        options: [
          'A vertical asymptote',
          'A critical point (possible local minimum or maximum)',
          'The function is undefined',
          'The y-intercept',
        ],
        correctIndex: 1,
        explanation: 'Points where f\'(c) = 0 or f\'(c) does not exist are critical points where the tangent line is horizontal, indicating possible local extrema.',
      },
    ],
  });

  if (!isOpen || !quiz) return null;

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) correct++;
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const score = calculateScore();
    if (score >= 70) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Save study progress
    const currentProgress = storage.getStudyProgress();
    const existing = currentProgress.find(p => p.subject.toLowerCase().includes(quiz.subject.toLowerCase()));
    if (existing) {
      existing.score = Math.round((existing.score + score) / 2);
      existing.topics_covered += 1;
      existing.last_studied = new Date().toISOString();
    } else {
      currentProgress.push({
        id: `prog_${Date.now()}`,
        user_id: storage.getUser().id,
        subject: quiz.subject,
        score,
        topics_covered: 1,
        last_studied: new Date().toISOString(),
      });
    }
    storage.saveStudyProgress(currentProgress);
    storage.recordContribution();
    onQuizComplete?.(score);
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const score = submitted ? calculateScore() : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#141a2e]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Buddy Practice Quiz
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {quiz.subject}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{quiz.topic}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quiz Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {submitted && (
            <div className={`p-4 rounded-xl border flex items-center gap-4 ${
              score >= 70 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}>
              <div className="w-12 h-12 rounded-full bg-slate-900/80 flex items-center justify-center text-2xl font-black">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-base text-white">
                  {score >= 85 ? 'Outstanding Work! 🌟' : score >= 60 ? 'Great Effort! Keep Going 💪' : 'Good Practice! Review the hints below 💡'}
                </h4>
                <p className="text-xs opacity-90">
                  You scored <strong className="text-white">{score}%</strong> ({Object.values(selectedAnswers).filter((ans, idx) => ans === quiz.questions[idx].correctIndex).length} of {quiz.questions.length} correct). Score recorded in your study progress!
                </p>
              </div>
            </div>
          )}

          {quiz.questions.map((q, qIndex) => {
            const isUserAnswered = selectedAnswers[qIndex] !== undefined;
            const userAnswer = selectedAnswers[qIndex];
            const isCorrect = submitted && userAnswer === q.correctIndex;

            return (
              <div
                key={q.id || qIndex}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {qIndex + 1}
                  </span>
                  <div className="flex-1 font-medium text-slate-100 text-sm">
                    {q.question}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2 pl-9">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = selectedAnswers[qIndex] === optIndex;
                    let optStyle = 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600';

                    if (submitted) {
                      if (optIndex === q.correctIndex) {
                        optStyle = 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200 font-semibold';
                      } else if (isSelected && optIndex !== q.correctIndex) {
                        optStyle = 'bg-red-950/40 border-red-500/50 text-red-300';
                      } else {
                        optStyle = 'opacity-50 border-transparent bg-slate-900';
                      }
                    } else if (isSelected) {
                      optStyle = 'bg-purple-600/20 border-purple-500 text-purple-200 ring-1 ring-purple-500';
                    }

                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleSelectOption(qIndex, optIndex)}
                        disabled={submitted}
                        className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between transition-all ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {submitted && optIndex === q.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                        )}
                        {submitted && isSelected && optIndex !== q.correctIndex && (
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on submit */}
                {submitted && (
                  <div className="mt-3 pl-9 pt-2 text-xs text-slate-400 border-t border-slate-800/60 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-purple-300">Buddy's Explanation:</strong> {q.explanation}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#141a2e]/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {answeredCount} of {quiz.questions.length} answered
          </div>

          <div className="flex items-center gap-3">
            {submitted ? (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retake Quiz
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={answeredCount < quiz.questions.length}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Submit Answers
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
