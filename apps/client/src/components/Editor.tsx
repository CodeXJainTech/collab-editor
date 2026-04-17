import { useRef, useEffect, useCallback } from "react";
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
}: EditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const isRemoteOpRef = useRef(false);
  const decorationsRef = useRef<string[]>([]);
  const revisionRef = useRef(0);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.setValue(doc);

    editor.onDidChangeModelContent((event) => {
      // skip changes caused by remote ops
      if (isRemoteOpRef.current) return;

      for (const change of event.changes) {
        const position = change.rangeOffset;
        const ops: Monaco.editor.IModelContentChange[] = []; // Not the type, we need TextOp
        
        const textOps: any[] = [];
        
        // Always delete first so that the base string is reduced before inserting characters 
        // at the same position.
        if (change.rangeLength > 0) {
          textOps.push({ type: "delete", position, count: change.rangeLength });
        }

        if (change.text.length > 0) {
          textOps.push({ type: "insert", position, chars: change.text });
        }

        if (textOps.length > 0) {
          onOp({
            ops: textOps,
            revision: revisionRef.current,
            userId: currentUserId,
            timestamp: Date.now(),
          });
        }
      }
    });

    editor.onDidChangeCursorPosition((event) => {
      onCursorChange({
        lineNumber: event.position.lineNumber,
        column: event.position.column,
      });
    });
  };

  // apply remote op to editor
  useEffect(() => {
    if (!remoteOp || !editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Prevent double-applying our own ops that the server broadcasted back
    if (remoteOp.userId === currentUserId) {
      revisionRef.current = remoteOp.revision;
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

    revisionRef.current = remoteOp.revision;
    isRemoteOpRef.current = false;
  }, [remoteOp]);

  // render remote cursors as Monaco decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    const newDecorations: Monaco.editor.IModelDeltaDecoration[] = [];

    remoteCursors.forEach(({ username, color, position }, userId) => {
      if (userId === currentUserId) return;

      // cursor line decoration
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

      // inject CSS for this user's cursor color dynamically
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
  }, [remoteCursors, currentUserId]);

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
        }}
      />
    </div>
  );
}
