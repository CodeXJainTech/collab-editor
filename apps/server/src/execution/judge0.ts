import axios from 'axios';
import type { Language } from '@collab-editor/shared';
import { JUDGE0_LANGUAGE_IDS } from '@collab-editor/shared';

const BASE_URL = process.env.JUDGE0_API_URL ?? '';
// const API_KEY = process.env.JUDGE0_API_KEY ?? '';

const MAX_CODE_SIZE = 50_000;
const POLL_INTERVAL_MS = 1_000;
const MAX_POLLS = 10;

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

// submit code to judge0 and return the token
async function submitCode(code: string, language: Language): Promise<string> {
  const languageId = JUDGE0_LANGUAGE_IDS[language];

  const response = await axios.post(
    `${BASE_URL}/submissions`,
    {
      source_code: Buffer.from(code).toString('base64'),
      language_id: languageId,
      stdin: '',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        // 'X-RapidAPI-Key': API_KEY,
        // 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      params: { base64_encoded: 'true', wait: 'false' },
    }
  );

  return response.data.token;
}

// poll judge0 until result is ready
async function pollResult(token: string): Promise<Judge0Result> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await axios.get(
      `${BASE_URL}/submissions/${token}`,
      {
        headers: {
          // 'X-RapidAPI-Key': API_KEY,
          // 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        params: { base64_encoded: 'true' },
      }
    );

    const data = response.data;

    // status id 1 = in queue, 2 = processing
    if (data.status.id <= 2) continue;

    return {
      stdout: data.stdout ? Buffer.from(data.stdout, 'base64').toString() : null,
      stderr: data.stderr ? Buffer.from(data.stderr, 'base64').toString() : null,
      status: data.status,
      time: data.time,
      memory: data.memory,
    };
  }

  return {
    stdout: null,
    stderr: 'execution timed out',
    status: { id: -1, description: 'Timeout' },
    time: null,
    memory: null,
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

  const token = await submitCode(code, language);
  const result = await pollResult(token);

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status.description,
    time: result.time ? parseFloat(result.time) : null,
  };
}