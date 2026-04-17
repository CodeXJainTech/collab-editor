import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  Operation,
  ServerToClientEvents,
} from "@collab-editor/shared";
import { joinRoom, leaveRoom, getRoomUsers } from "./roomManager";
import redis, {
  getOpsSince,
  pushOp,
  roomDocKey,
  roomRevKey,
} from "../db/redis";
import { transformOp, applyOp } from "../ot/engine";

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// track which room each socket is in so we can clean up on disconnect
const socketRoomMap = new Map<
  string,
  { roomId: string; userId: string; username: string }
>();

export function registerRoomHandlers(io: IoServer, socket: IoSocket) {
  socket.on("join-room", async ({ roomId, username }) => {
    try {
      const userId = socket.id;
      const state = await joinRoom(roomId, userId, username);

      if (!state) {
        socket.emit("error", {
          code: "ROOM_NOT_FOUND",
          message: "room does not exist",
        });
        return;
      }

      await socket.join(roomId);
      socketRoomMap.set(socket.id, { roomId, userId, username });

      // send full state to the joining user
      socket.emit("room-state", {
        room: state.room,
        doc: state.doc,
        revision: state.revision,
        users: state.users,
      });

      // notify everyone else
      socket
        .to(roomId)
        .emit("user-joined", {
          user: {
            id: userId,
            username,
            color: state.users.find((u) => u.id === userId)?.color ?? "#60A5FA",
          },
        });

      // system chat message
      io.to(roomId).emit("chat-broadcast", {
        userId: "system",
        username: "system",
        text: `${username} joined`,
        timestamp: Date.now(),
        isSystem: true,
      });

      console.log(`${username} joined room ${roomId}`);
    } catch (err) {
      console.error("join-room error", err);
      socket.emit("error", {
        code: "JOIN_FAILED",
        message: "could not join room",
      });
    }
  });

  socket.on("disconnect", async () => {
    const info = socketRoomMap.get(socket.id);
    if (!info) return;

    const { roomId, userId, username } = info;
    socketRoomMap.delete(socket.id);

    await leaveRoom(roomId, userId);

    io.to(roomId).emit("user-left", { userId, username });

    io.to(roomId).emit("chat-broadcast", {
      userId: "system",
      username: "system",
      text: `${username} left`,
      timestamp: Date.now(),
      isSystem: true,
    });

    console.log(`${username} left room ${roomId}`);
  });

  socket.on("op", async ({ op }) => {
    const info = socketRoomMap.get(socket.id);
    if (!info) return;

    const { roomId, userId } = info;

    try {
      const currentRevision = parseInt(
        (await redis.get(roomRevKey(roomId))) ?? "0",
        10,
      );

      // get all ops the client has not seen yet
      const concurrentOps = await getOpsSince(roomId, op.revision);

      // transform the incoming op against each concurrent op
      let transformedOp: Operation = { ...op, userId };
      for (const concurrent of concurrentOps) {
        transformedOp = transformOp(transformedOp, concurrent);
      }

      // apply to document
      const currentDoc = (await redis.get(roomDocKey(roomId))) ?? "";
      const newDoc = applyOp(currentDoc, transformedOp);
      const newRevision = currentRevision + 1;

      transformedOp.revision = newRevision;

      // persist
      await redis.set(roomDocKey(roomId), newDoc);
      await redis.set(roomRevKey(roomId), String(newRevision));
      await pushOp(roomId, transformedOp);

      // broadcast transformed op to all clients in the room including sender
      io.to(roomId).emit("op-broadcast", {
        op: transformedOp,
        userId,
      });
    } catch (err) {
      console.error("op error", err);
      socket.emit("error", { code: "OP_FAILED", message: "operation failed" });
    }
  });
}
