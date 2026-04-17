import { useState } from 'react';
import type { Language } from '@collab-editor/shared';

interface RunResult {
  stdout: string;
  stderr: string;
  status: string;
  time: number | null;
}

interface OutputPanelProps {
  language: Language;
  onRun: () => void;
  result: RunResult | null;
  running: boolean;
}

export default function OutputPanel({ language, onRun, result, running }: OutputPanelProps) {
  return (
    <div className="flex flex-col h-full bg-neutral-900 border-t border-neutral-700">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-800">
        <span className="text-xs text-neutral-400">output</span>
        <button
          onClick={onRun}
          disabled={running}
          className="text-xs px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-neutral-600 text-white rounded"
        >
          {running ? 'running...' : `run ${language}`}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {!result && !running && (
          <span className="text-neutral-500">click run to execute code</span>
        )}

        {running && (
          <span className="text-neutral-400">executing...</span>
        )}

        {result && !running && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${
                result.status === 'Accepted'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
              }`}>
                {result.status}
              </span>
              {result.time && (
                <span className="text-xs text-neutral-500">{result.time}s</span>
              )}
            </div>

            {result.stdout && (
              <pre className="text-green-400 whitespace-pre-wrap">{result.stdout}</pre>
            )}

            {result.stderr && (
              <pre className="text-red-400 whitespace-pre-wrap">{result.stderr}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}