import type { Operation } from "./op";
import type { User, Room, Language, CursorPosition } from "./room";

// Events sent FROM client TO server
export interface ClientToServerEvents {
  "join-room": (payload: { roomId: string; username: string }) => void;
  op: (payload: { op: Operation }) => void;
  "cursor-move": (payload: { position: CursorPosition }) => void;
  "chat-message": (payload: { text: string }) => void;
  "run-code": (payload: { code: string; language: Language }) => void;
  "language-change": (payload: { language: Language }) => void;
}

// Events sent FROM server TO client
export interface ServerToClientEvents {
  "room-state": (payload: {
    room: Room;
    doc: string;
    revision: number;
    users: User[];
  }) => void;
  "op-broadcast": (payload: { op: Operation; userId: string }) => void;
  "cursor-broadcast": (payload: {
    userId: string;
    username: string;
    color: string;
    position: CursorPosition;
  }) => void;
  "chat-broadcast": (payload: {
    userId: string;
    username: string;
    text: string;
    timestamp: number;
    isSystem: boolean;
  }) => void;
  "run-result": (payload: {
    stdout: string;
    stderr: string;
    status: string;
    time: number | null;
  }) => void;
  "user-joined": (payload: { user: User }) => void;
  "user-left": (payload: { userId: string; username: string }) => void;
  "language-changed": (payload: { language: Language; userId: string }) => void;
  error: (payload: { code: string; message: string }) => void;
}
