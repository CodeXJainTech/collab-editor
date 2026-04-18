import type { Language } from '@collab-editor/shared';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python',     label: 'Python'     },
  { value: 'go',         label: 'Go'         },
];

interface LanguageSelectorProps {
  current: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageSelector({ current, onChange }: LanguageSelectorProps) {
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as Language)}
      className="text-xs bg-neutral-700 text-white border border-neutral-600 rounded px-2 py-1 focus:outline-none focus:border-neutral-400"
    >
      {LANGUAGES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}