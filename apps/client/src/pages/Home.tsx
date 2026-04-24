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
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-white gap-8 p-4 animate-fade-in relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="text-center relative z-10 animate-slide-up">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Collab Editor</h1>
        <p className="text-neutral-400 text-sm font-medium tracking-wide">
          Create a room, share the link, code together.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-2xl flex flex-col gap-4 w-full max-w-sm relative z-10 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 mb-2 px-1">Select Language</h2>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            onClick={() => handleCreate(lang.value)}
            disabled={!!loading}
            className="group flex items-center justify-between px-5 py-4 bg-black/20 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-black/20 border border-white/5 hover:border-white/20 rounded-xl text-sm transition-all shadow-sm hover:shadow-lg"
          >
            <span className="font-medium text-white group-hover:text-blue-300 transition-colors">{lang.label}</span>
            {loading === lang.value ? (
              <span className="text-blue-400 text-xs flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Creating...
              </span>
            ) : (
              <span className="text-neutral-500 text-xs font-medium bg-white/5 px-2 py-1 rounded-md">{lang.description}</span>
            )}
          </button>
        ))}
        {error && (
          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            {error}
          </div>
        )}
      </div>

    </div>
  );
}