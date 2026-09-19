import React, { useState } from 'react';
import { DayContribution } from '../types';
import { Flame, Calendar, Award, Info } from 'lucide-react';

interface ContributionHeatmapProps {
  contributions: DayContribution[];
  streakDays: number;
  longestStreak: number;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  contributions,
  streakDays,
  longestStreak,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  // Group contributions into 52/53 columns of 7 days
  const weeks: DayContribution[][] = [];
  let currentWeek: DayContribution[] = [];

  // Sort contributions chronologically
  const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));

  // Determine starting weekday of first entry so columns align
  sorted.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === sorted.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const totalContributions = contributions.reduce((acc, curr) => acc + curr.count, 0);

  // Month labels across 52 weeks
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

  // Color mapping matching the uploaded image exactly
  const getSquareColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-[#0e4429] hover:ring-1 hover:ring-emerald-400';
      case 2:
        return 'bg-[#006d32] hover:ring-1 hover:ring-emerald-300';
      case 3:
        return 'bg-[#26a641] hover:ring-1 hover:ring-emerald-200';
      case 4:
        return 'bg-[#39d353] hover:ring-1 hover:ring-white';
      default:
        return 'bg-[#161b22] hover:bg-[#21262d]';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="contribution-heatmap-card" className="bg-[#0d1117] border border-slate-800/80 rounded-xl p-5 text-slate-200 shadow-xl shadow-purple-950/10">
      {/* Header matching image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
            {totalContributions} contributions in the last year
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Flame className="w-3.5 h-3.5 fill-current text-orange-400" />
            <span>{streakDays} day streak</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
            <span>Contribution settings</span>
            <span className="text-[10px]">▼</span>
          </div>
        </div>
      </div>

      {/* The Heatmap Grid */}
      <div className="relative border border-slate-800/60 rounded-lg p-3 sm:p-4 bg-[#0a0d14] overflow-x-auto">
        {/* Month labels */}
        <div className="flex text-[11px] text-slate-400 mb-2 pl-7 min-w-[720px] justify-between">
          {months.map((m, idx) => (
            <span key={idx}>{m}</span>
          ))}
        </div>

        {/* Day row & squares */}
        <div className="flex min-w-[720px]">
          {/* Day of week labels */}
          <div className="flex flex-col justify-between text-[10px] text-slate-500 pr-2 select-none py-[2px]">
            <span className="h-[11px] leading-[11px]"></span>
            <span className="h-[11px] leading-[11px]">Mon</span>
            <span className="h-[11px] leading-[11px]"></span>
            <span className="h-[11px] leading-[11px]">Wed</span>
            <span className="h-[11px] leading-[11px]"></span>
            <span className="h-[11px] leading-[11px]">Fri</span>
            <span className="h-[11px] leading-[11px]"></span>
          </div>

          {/* Grid columns */}
          <div className="flex gap-[3px] flex-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {week.map((day, dIdx) => (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    onMouseEnter={() => setHoveredDay({ date: day.date, count: day.count })}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-all duration-150 ${getSquareColor(
                      day.level
                    )}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Legend & Hover readout */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/40 gap-2 min-w-[720px]">
          <div className="flex items-center gap-2">
            {hoveredDay ? (
              <span className="text-emerald-300 font-medium text-xs animate-in fade-in">
                {hoveredDay.count === 0 ? 'No' : hoveredDay.count} contribution{hoveredDay.count === 1 ? '' : 's'} on {formatDate(hoveredDay.date)}
              </span>
            ) : (
              <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors text-[11px]">
                Learn how we count contributions
              </span>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Less</span>
            <div className="w-[10px] h-[10px] rounded-[2px] bg-[#161b22]" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-[#0e4429]" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-[#006d32]" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-[#26a641]" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-[#39d353]" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Streak and Study Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100">{streakDays} Days</div>
            <div className="text-xs text-slate-400">Current Streak</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100">{longestStreak} Days</div>
            <div className="text-xs text-slate-400">Longest Streak</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100">Top 5%</div>
            <div className="text-xs text-slate-400">Study Consistency</div>
          </div>
        </div>
      </div>
    </div>
  );
};
