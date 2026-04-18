import { useEffect, useRef } from 'react';
import { io, Socket, Manager } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@collab-editor/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let manager: Manager | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    manager = new Manager(
      import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001',
      { autoConnect: false }
    );
    socket = manager.socket('/') as AppSocket;
  }
  return socket;
}

export function getManager(): Manager {
  getSocket();
  return manager!;
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