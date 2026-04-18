import axios from 'axios';
import type { Language } from '@collab-editor/shared';

const BASE_URL = process.env.PISTON_API_URL;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const MAX_CODE_SIZE = 50_000;

const PISTON_LANGUAGE_MAP: Record<Language, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python:     { language: 'python',     version: '3.10.0'  },
  go:         { language: 'go',         version: '1.16.2'  },
};

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

async function runOnPiston(code: string, language: Language) {
  const { language: pistonLang, version } = PISTON_LANGUAGE_MAP[language];

  const response = await axios.post(
    `${BASE_URL}/execute`,
    {
      language: pistonLang,
      version,
      files: [{ content: code }],
      stdin: '',
      run_timeout: 5000,
      compile_timeout: 10000,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    }
  );

  const run = response.data.run;
  const compile = response.data.compile;

  if (compile && compile.code !== 0) {
    return {
      stdout: '',
      stderr: compile.stderr || compile.output || 'compile error',
      status: 'Compile Error',
      time: null,
    };
  }

  return {
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    status: run.code === 0 ? 'Accepted' : 'Runtime Error',
    time: null,
  };
}

export async function executeCode(code: string, language: Language) {
  if (code.length > MAX_CODE_SIZE) {
    return {
      stdout: '',
      stderr: 'code exceeds maximum size limit',
      status: 'rejected',
      time: null,
    };
  }

  if (!IS_PRODUCTION || !BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const output = MOCK_OUTPUTS[language](code);
    return {
      stdout: output + '\n',
      stderr: '',
      status: 'Accepted',
      time: 0.042,
    };
  }

  return runOnPiston(code, language);
}