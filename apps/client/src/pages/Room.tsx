import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import type { User, Room as RoomType } from "@collab-editor/shared";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const [room, setRoom] = useState<RoomType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [username] = useState(
    () => `user_${Math.random().toString(36).slice(2, 6)}`,
  );

  useEffect(() => {
    if (!roomId) return;

    socket.emit("join-room", { roomId, username });

    socket.on("room-state", ({ room, users }) => {
      setRoom(room);
      setUsers(users);
    });

    socket.on("user-joined", ({ user }) => {
      setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    });

    socket.on("user-left", ({ userId }) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    socket.on("error", ({ code }) => {
      if (code === "ROOM_NOT_FOUND") navigate("/");
    });

    return () => {
      socket.off("room-state");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("error");
    };
  }, [roomId, socket, username, navigate]);

  if (!room) return <div>joining room...</div>;

  return (
    <div>
      <h2>Room: {room.id}</h2>
      <p>Language: {room.language}</p>
      <p>Share this URL: {window.location.href}</p>
      <h3>Users in room</h3>
      <ul>
        {users.map((u) => (
          <li key={u.id} style={{ color: u.color }}>
            {u.username} {u.id === socket.id ? "(you)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
