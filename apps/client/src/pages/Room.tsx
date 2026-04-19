import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getManager, useSocket } from "../hooks/useSocket";
import { useOT } from "../hooks/useOT";
import Editor from "../components/Editor";
import type {
  User,
  Room as RoomType,
  Operation,
  CursorPosition,
  Language,
} from "@collab-editor/shared";
import OutputPanel from "../components/OutputPanel";
import LanguageSelector from "../components/LanguageSelector";
import Chat from "../components/Chat";
import UsernameModal from "../components/UsernameModal";
import ConnectionBanner from "../components/ConnectionBanner";

type RemoteCursor = {
  username: string;
  color: string;
  position: { lineNumber: number; column: number };
};

type ChatMessage = {
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
};

type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const manager = getManager();

  const [room, setRoom] = useState<RoomType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [doc, setDoc] = useState("");
  const [remoteOp, setRemoteOp] = useState<Operation | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(
    new Map(),
  );
  const { revisionRef, setRevision, receiveOp } = useOT({
    userId: socket.id ?? "",
    onRemoteOp: setRemoteOp,
  });
  const getRevision = useCallback(() => revisionRef.current, [revisionRef]);
  const [runResult, setRunResult] = useState<{
    stdout: string;
    stderr: string;
    status: string;
    time: number | null;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const docRef = useRef("");

  const [refreshKey, setRefreshKey] = useState(0);

  const [language, setLanguage] = useState<Language>("javascript");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connected");
  const [username, setUsername] = useState<string | null>(() => {
    return (
      (roomId ? sessionStorage.getItem(`username-${roomId}`) : null) ||
      localStorage.getItem("collab-username") ||
      null
    );
  });

  function handleUsernameConfirm(name: string) {
    if (roomId) sessionStorage.setItem(`username-${roomId}`, name);
    localStorage.setItem("collab-username", name);
    setUsername(name);
  }

  useEffect(() => {
    if (!roomId || !username) return;

    socket.emit("join-room", { roomId, username });

    socket.on("room-state", ({ room, users, doc, revision, chatHistory }) => {
      setRoom(room);
      setUsers(users);
      setDoc(doc);
      setRevision(revision);
      setLanguage(room.language);
      setChatMessages(chatHistory);
      setRefreshKey((prev) => prev + 1);
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
      if (code === "ROOM_NOT_FOUND") navigate("/not-found");
    });

    socket.on("run-result", (result) => {
      setRunResult(result);
      setRunning(false);
    });

    socket.on("language-changed", ({ language }) => {
      setLanguage(language);
    });

    socket.on("chat-broadcast", (message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    manager.on("reconnect_attempt", () => {
      setConnectionStatus("reconnecting");
    });

    manager.on("reconnect", () => {
      setConnectionStatus("connected");
      socket.emit("join-room", { roomId, username: username as string });
    });

    return () => {
      socket.off("run-result");
      socket.off("room-state");
      socket.off("op-broadcast");
      socket.off("cursor-broadcast");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("error");
      socket.off("language-changed");
      socket.off("chat-broadcast");
      socket.off("disconnect");
      manager.off("reconnect_attempt");
      manager.off("reconnect");
    };
  }, [roomId, socket, username, navigate, receiveOp, setRevision]);

  const handleRun = useCallback(() => {
    if (!room) return;
    setRunning(true);
    setRunResult(null);
    socket.emit("run-code", {
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

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      socket.emit("language-change", { language: lang });
    },
    [socket],
  );

  const handleSendChat = useCallback(
    (text: string) => {
      socket.emit("chat-message", { text });
    },
    [socket],
  );

  const handleRefresh = useCallback(() => {
    if (!roomId) return;
    socket.emit("request-room-state", { roomId });
  }, [socket, roomId]);

  if (!username) {
    return (
      <div className="h-screen bg-neutral-900">
        <UsernameModal onConfirm={handleUsernameConfirm} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        joining room...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white">
      <ConnectionBanner status={connectionStatus} />

      <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">
            room: {room.id.slice(0, 8)}...
          </span>
          <LanguageSelector
            current={language}
            onChange={handleLanguageChange}
          />
        </div>
        <div className="flex gap-2">
          {users.map((u) => (
            <span
              key={u.id}
              className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: u.color, color: "white" }}
            >
              {u.username}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors"
            onClick={handleRefresh}
            title="Refresh Editor"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            refresh
          </button>
          <button
            className="text-sm text-neutral-400 hover:text-white transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }}
          >
            copy link
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Editor
              key={refreshKey}
              doc={doc}
              language={language}
              users={users}
              currentUserId={socket.id ?? ""}
              onOp={handleOp}
              onCursorChange={handleCursorChange}
              remoteOp={remoteOp}
              remoteCursors={remoteCursors}
              getRevision={getRevision}
            />
          </div>
          <div className="h-48">
            <OutputPanel
              language={language}
              onRun={handleRun}
              result={runResult}
              running={running}
            />
          </div>
        </div>

        <div className="w-92">
          <Chat
            messages={chatMessages}
            currentUserId={socket.id ?? ""}
            onSend={handleSendChat}
          />
        </div>
      </div>
    </div>
  );
}
