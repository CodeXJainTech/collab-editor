import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Language } from '@collab-editor/shared';

const LANGUAGES: { value: Language; label: string; description: string }[] = [
  { value: 'javascript', label: 'JavaScript', description: 'Node.js 18' },
  { value: 'python',     label: 'Python',     description: 'Python 3.10' },
  { value: 'go',         label: 'Go',         description: 'Go 1.16'    },
];

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<Language | null>(null);
  const [error, setError] = useState('');

  async function handleCreate(language: Language) {
    setLoading(language);
    setError('');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'}/rooms`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language }),
        }
      );
      const data = await res.json();
      navigate(`/room/${data.room.id}`);
    } catch {
      setError('could not create room, is the server running?');
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-900 text-white gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-medium mb-2">collab editor</h1>
        <p className="text-neutral-400 text-sm">
          create a room, share the link, code together
        </p>
      </div>

      <div className="flex flex-col gap-3 w-64">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            onClick={() => handleCreate(lang.value)}
            disabled={!!loading}
            className="flex items-center justify-between px-4 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700 rounded-lg text-sm"
          >
            <span>{lang.label}</span>
            <span className="text-neutral-500 text-xs">{lang.description}</span>
            {loading === lang.value && (
              <span className="text-neutral-400 text-xs">creating...</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}