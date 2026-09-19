import React, { useState } from 'react';
import { Memory, MemoryCategory } from '../types';
import { storage } from '../lib/storage';
import { Brain, Search, Plus, Trash2, Edit2, ShieldAlert, Sparkles, Filter, Check } from 'lucide-react';

interface MemoryVaultViewProps {
  memories: Memory[];
  onMemoriesUpdated: () => void;
}

export const MemoryVaultView: React.FC<MemoryVaultViewProps> = ({
  memories,
  onMemoriesUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newImportance, setNewImportance] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [newCategory, setNewCategory] = useState<MemoryCategory>('goal');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImportance, setEditImportance] = useState<1 | 2 | 3 | 4 | 5>(3);

  const categories = ['all', 'goal', 'academic', 'interest', 'project', 'preference', 'general'];

  const filtered = memories.filter(m => {
    const matchSearch = m.memory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    storage.addMemory(newText.trim(), newImportance, newCategory);
    setNewText('');
    setIsAdding(false);
    onMemoriesUpdated();
  };

  const handleDelete = (id: string) => {
    storage.deleteMemory(id);
    onMemoriesUpdated();
  };

  const handleStartEdit = (m: Memory) => {
    setEditingId(m.id);
    setEditText(m.memory);
    setEditImportance(m.importance);
  };

  const handleSaveEdit = (id: string) => {
    storage.updateMemory(id, editText, editImportance);
    setEditingId(null);
    onMemoriesUpdated();
  };

  const getImportanceBadge = (lvl: number) => {
    switch (lvl) {
      case 5:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Level 5: Core Identity</span>;
      case 4:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Level 4: Long-Term</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Level 3: Important</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Level 2: Useful</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">Level 1: Temporary</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-blue-900/30 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Buddy's Memory Vault
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                {memories.length} Stored
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-lg">
              Buddy automatically extracts goals, interests, projects, and academic details after conversations so you never have to repeat yourself.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Memory</span>
        </button>
      </div>

      {/* Adding Box */}
      {isAdding && (
        <form onSubmit={handleAdd} className="p-4 rounded-xl bg-[#0d1117] border border-purple-500/40 space-y-3 animate-in fade-in">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Add Custom Memory
          </h3>
          <textarea
            rows={2}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="e.g. Taking the SAT exam on November 4th; needs extra help with Math section..."
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-slate-400 mr-2">Category:</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="goal">Goal</option>
                  <option value="academic">Academic</option>
                  <option value="interest">Interest</option>
                  <option value="project">Project</option>
                  <option value="preference">Preference</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mr-2">Importance:</label>
                <select
                  value={newImportance}
                  onChange={e => setNewImportance(parseInt(e.target.value) as any)}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-purple-300 font-semibold"
                >
                  <option value={5}>5 - Core Identity</option>
                  <option value={4}>4 - Long-Term</option>
                  <option value={3}>3 - Important</option>
                  <option value={2}>2 - Useful</option>
                  <option value={1}>1 - Temporary</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500"
              >
                Save to Vault
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0d1117] border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-[#0d1117]">
            <Brain className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-300">No memories found</div>
            <div className="text-xs text-slate-500 mt-1">Start chatting or add a memory above!</div>
          </div>
        ) : (
          filtered.map(m => {
            const isEditing = editingId === m.id;

            return (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-[#0d1117] border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={editImportance}
                        onChange={e => setEditImportance(parseInt(e.target.value) as any)}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-purple-300"
                      >
                        <option value={5}>Lvl 5 (Core)</option>
                        <option value={4}>Lvl 4 (Long-term)</option>
                        <option value={3}>Lvl 3 (Important)</option>
                        <option value={2}>Lvl 2 (Useful)</option>
                        <option value={1}>Lvl 1 (Temp)</option>
                      </select>
                      <button
                        onClick={() => handleSaveEdit(m.id)}
                        className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-100 leading-snug">
                      {m.memory}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {getImportanceBadge(m.importance)}
                      <span className="capitalize text-slate-500">• {m.category}</span>
                      <span className="text-slate-600">• {new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStartEdit(m)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Edit memory"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Privacy & Memory Safety Guarantee:</strong> Buddy only retains helpful learning preferences and student milestones. Buddy never stores passwords, credit cards, or sensitive personal data. You can delete or edit any memory at any time.
        </div>
      </div>
    </div>
  );
};
