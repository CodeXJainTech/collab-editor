import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { useOT } from "../hooks/useOT";
import Editor from "../components/Editor";
import type {
  User,
  Room as RoomType,
  Operation,
  CursorPosition,
} from "@collab-editor/shared";
import OutputPanel from "../components/OutputPanel";

type RemoteCursor = {
  username: string;
  color: string;
  position: { lineNumber: number; column: number };
};

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();

  const [room, setRoom] = useState<RoomType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [doc, setDoc] = useState("");
  const [remoteOp, setRemoteOp] = useState<Operation | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(
    new Map(),
  );

  const [username] = useState(
    () => `user_${Math.random().toString(36).slice(2, 6)}`,
  );

  const { revisionRef, setRevision, receiveOp } = useOT({
    userId: socket.id ?? "",
    onRemoteOp: setRemoteOp,
  });

  const [runResult, setRunResult] = useState<{
    stdout: string;
    stderr: string;
    status: string;
    time: number | null;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const docRef = useRef('');

  useEffect(() => {
    if (!roomId) return;

    socket.emit("join-room", { roomId, username });

    socket.on("room-state", ({ room, users, doc, revision }) => {
      setRoom(room);
      setUsers(users);
      setDoc(doc);
      setRevision(revision);
    });

    socket.on("op-broadcast", ({ op }) => {
      receiveOp(op);
    });

    socket.on("cursor-broadcast", ({ userId, username, color, position }) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(userId, { username, color, position });
        return next;
      });
    });

    socket.on("user-joined", ({ user }) => {
      setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    });

    socket.on("user-left", ({ userId }) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("error", ({ code }) => {
      if (code === "ROOM_NOT_FOUND") navigate("/");
    });

    socket.on('run-result', (result) => {
      setRunResult(result);
      setRunning(false);
    });

    return () => {
      socket.off('run-result');
      socket.off("room-state");
      socket.off("op-broadcast");
      socket.off("cursor-broadcast");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("error");
    };
  }, [roomId, socket, username, navigate, receiveOp, setRevision]);

  const handleRun = useCallback(() => {
    if (!room) return;
    setRunning(true);
    setRunResult(null);
    socket.emit('run-code', {
      code: docRef.current,
      language: room.language,
    });
  }, [socket, room]);


  useEffect(() => {
    docRef.current = doc;
  }, [doc]);


  const handleOp = useCallback(
    (op: Operation) => {
      socket.emit("op", { op });
    },
    [socket],
  );

  const handleCursorChange = useCallback(
    (position: CursorPosition) => {
      if (!roomId) return;
      socket.emit("cursor-move", { position });
    },
    [socket, roomId],
  );

  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        joining room...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-700">
        <span className="text-sm text-neutral-400">room: {room.id.slice(0, 8)}...</span>
        <div className="flex gap-2">
          {users.map((u) => (
            <span
              key={u.id}
              className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: u.color, color: 'white' }}
            >
              {u.username}
            </span>
          ))}
        </div>
        <button
          className="text-xs text-neutral-400 hover:text-white"
          onClick={() => navigator.clipboard.writeText(window.location.href)}
        >
          copy link
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Editor
          doc={doc}
          language={room.language}
          users={users}
          currentUserId={socket.id ?? ''}
          onOp={handleOp}
          onCursorChange={handleCursorChange}
          remoteOp={remoteOp}
          remoteCursors={remoteCursors}
        />
      </div>

      <div className="h-48">
        <OutputPanel
          language={room.language}
          onRun={handleRun}
          result={runResult}
          running={running}
        />
      </div>
    </div>
  );
}
