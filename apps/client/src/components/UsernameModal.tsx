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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 w-80">
        <h2 className="text-white text-sm font-medium mb-4">enter your name to join</h2>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="your name..."
          maxLength={20}
          className="w-full text-sm bg-neutral-900 text-white border border-neutral-600 rounded px-3 py-2 focus:outline-none focus:border-neutral-400 placeholder-neutral-500 mb-4"
        />
        <button
          onClick={handleSubmit}
          disabled={value.trim().length < 2}
          className="w-full text-sm py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded"
        >
          join room
        </button>
      </div>
    </div>
  );
}