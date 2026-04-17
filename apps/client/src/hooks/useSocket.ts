import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@collab-editor/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001', {
      autoConnect: false,
    });
  }
  return socket;
}

export function useSocket() {
  const socketRef = useRef<AppSocket>(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    if (!s.connected) s.connect();
    return () => {
      s.disconnect();
    };
  }, []);

  return socketRef.current;
}