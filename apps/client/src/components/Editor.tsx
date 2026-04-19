import { useRef, useEffect } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import type { Operation, Language, User } from "@collab-editor/shared";

interface EditorProps {
  doc: string;
  language: Language;
  users: User[];
  currentUserId: string;
  onOp: (op: Operation) => void;
  onCursorChange: (position: { lineNumber: number; column: number }) => void;
  remoteOp: Operation | null;
  remoteCursors: Map<
    string,
    {
      username: string;
      color: string;
      position: { lineNumber: number; column: number };
    }
  >;
  getRevision: () => number;
}

export default function Editor({
  doc,
  language,
  users,
  currentUserId,
  onOp,
  onCursorChange,
  remoteOp,
  remoteCursors,
  getRevision,
}: EditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const isRemoteOpRef = useRef(false);
  const decorationsRef = useRef<string[]>([]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.setValue(doc);

    editor.onDidChangeModelContent((event) => {
      if (isRemoteOpRef.current) return;

      const allOps: any[] = [];

      for (const change of event.changes) {
        const position = change.rangeOffset;

        if (change.rangeLength > 0) {
          allOps.push({ type: "delete", position, count: change.rangeLength });
        }
        if (change.text.length > 0) {
          allOps.push({ type: "insert", position, chars: change.text });
        }
      }

      if (allOps.length > 0) {
        onOp({
          ops: allOps,
          revision: getRevision(),
          userId: currentUserId,
          timestamp: Date.now(),
        });
      }
    });

    const cursorTimeoutRef = { current: null as any };
    editor.onDidChangeCursorPosition((event) => {
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = setTimeout(() => {
        onCursorChange({
          lineNumber: event.position.lineNumber,
          column: event.position.column,
        });
      }, 50);
    });
  };

  useEffect(() => {
    if (!remoteOp || !editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    if (remoteOp.userId === currentUserId) {
      return;
    }

    isRemoteOpRef.current = true;

    for (const textOp of remoteOp.ops) {
      if (textOp.type === "insert" && textOp.chars) {
        const position = model.getPositionAt(textOp.position);
        editor.executeEdits("remote", [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column,
            ),
            text: textOp.chars,
          },
        ]);
      }

      if (textOp.type === "delete") {
        const startPos = model.getPositionAt(textOp.position);
        const endPos = model.getPositionAt(
          textOp.position + (textOp.count ?? 0),
        );
        editor.executeEdits("remote", [
          {
            range: new monaco.Range(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column,
            ),
            text: "",
          },
        ]);
      }
    }

    isRemoteOpRef.current = false;
  }, [remoteOp]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const render = () => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;
      const model = editor.getModel();
      if (!model) return;

      const newDecorations: Monaco.editor.IModelDeltaDecoration[] = [];

      remoteCursors.forEach(({ username, color, position }, userId) => {
        if (userId === currentUserId) return;

        newDecorations.push({
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          options: {
            className: `remote-cursor-${userId.slice(0, 6)}`,
            beforeContentClassName: `remote-cursor-before-${userId.slice(0, 6)}`,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });

        const styleId = `cursor-style-${userId.slice(0, 6)}`;
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.textContent = `
            .remote-cursor-${userId.slice(0, 6)} {
              border-left: 2px solid ${color};
            }
            .remote-cursor-before-${userId.slice(0, 6)}::before {
              content: '${username}';
              background: ${color};
              color: white;
              font-size: 10px;
              padding: 1px 4px;
              border-radius: 2px;
              position: absolute;
              top: -18px;
              white-space: nowrap;
              pointer-events: none;
            }
          `;
          document.head.appendChild(style);
        }
      });

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations,
      );
    };

    const timeout = setTimeout(render, 10);
    return () => clearTimeout(timeout);
  }, [remoteCursors, currentUserId, remoteOp]);

  const monacoLanguage =
    language === "javascript"
      ? "javascript"
      : language === "python"
        ? "python"
        : "go";

  return (
    <div className="h-full w-full">
      <MonacoEditor
        height="100%"
        language={monacoLanguage}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoClosingOvertype: "always",
          autoSurround: "languageDefined",
        }}
      />
    </div>
  );
}
