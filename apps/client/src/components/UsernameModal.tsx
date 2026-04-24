import { useState } from 'react';

interface UsernameModalProps {
  onConfirm: (username: string) => void;
}

export default function UsernameModal({ onConfirm }: UsernameModalProps) {
  const [value, setValue] = useState('');

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) return;
    onConfirm(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-panel border border-white/10 rounded-2xl p-8 w-80 shadow-2xl animate-slide-up relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <h2 className="text-white text-lg font-semibold tracking-wide mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Join Session
        </h2>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your name..."
          maxLength={20}
          className="w-full text-sm bg-black/20 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-neutral-500 mb-6 transition-all"
        />
        <button
          onClick={handleSubmit}
          disabled={value.trim().length < 2}
          className="w-full text-sm font-medium py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-neutral-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}