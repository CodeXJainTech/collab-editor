import type { Language } from '@collab-editor/shared';

const MOCK_OUTPUTS: Record<Language, (code: string) => string> = {
  javascript: (code) => {
    const match = code.match(/console\.log\(['"`](.+?)['"`]\)/);
    return match ? match[1] : 'mock javascript output';
  },
  python: (code) => {
    const match = code.match(/print\(['"`](.+?)['"`]\)/);
    return match ? match[1] : 'mock python output';
  },
  go: (code) => {
    const match = code.match(/Println\(['"`](.+?)['"`]\)/);
    return match ? match[1] : 'mock go output';
  },
};

export async function executeCode(code: string, language: Language) {
  if (!code.trim()) {
    return {
      stdout: '',
      stderr: 'no code to run',
      status: 'rejected',
      time: null,
    };
  }

  // simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const output = MOCK_OUTPUTS[language](code);

  return {
    stdout: output + '\n',
    stderr: '',
    status: 'Accepted',
    time: 0.042,
  };
}