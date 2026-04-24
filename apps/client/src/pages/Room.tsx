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
      <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
        <UsernameModal onConfirm={handleUsernameConfirm} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent text-white animate-fade-in">
        <div className="glass-panel px-6 py-4 rounded-xl flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-medium tracking-wide">Joining Room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-transparent text-white p-2 sm:p-4 gap-4 animate-fade-in">
      <ConnectionBanner status={connectionStatus} />

      <div className="glass-panel flex items-center justify-between px-6 py-3 rounded-2xl shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Workspace</span>
            <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {room.id.slice(0, 8)}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10 mx-2"></div>
          <LanguageSelector
            current={language}
            onChange={handleLanguageChange}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {users.map((u) => (
            <span
              key={u.id}
              className="text-xs px-3 py-1.5 rounded-full font-medium shadow-sm transition-transform hover:scale-105 border border-white/10"
              style={{ backgroundColor: u.color, color: "white" }}
            >
              {u.username}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-blue-400 transition-colors"
            onClick={handleRefresh}
            title="Refresh Editor"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
            Refresh
          </button>
          <button
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 rounded-xl transition-all border border-blue-500/20"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Share
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-4">
        <div className="flex flex-col flex-1 overflow-hidden gap-4">
          <div className="flex-1 overflow-hidden glass-panel rounded-2xl shadow-xl flex flex-col">
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
          <div className="h-56 glass-panel rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <OutputPanel
              language={language}
              onRun={handleRun}
              result={runResult}
              running={running}
            />
          </div>
        </div>

        <div className="w-96 glass-panel rounded-2xl shadow-xl flex flex-col overflow-hidden">
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
