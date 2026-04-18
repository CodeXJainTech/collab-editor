import { Operation } from '@collab-editor/shared';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6389');

redis.on('error', (err) => {
  console.error('redis error', err.message);
});

const ROOM_TTL = 60 * 60 * 24;

export function roomDocKey(roomId: string) {
  return `room:${roomId}:doc`;
}

export function roomRevKey(roomId: string) {
  return `room:${roomId}:revision`;
}

export function roomUsersKey(roomId: string) {
  return `room:${roomId}:users`;
}

export function roomLangKey(roomId: string) {
  return `room:${roomId}:language`;
}

export async function touchRoomTTL(roomId: string) {
  await Promise.all([
    redis.expire(roomDocKey(roomId), ROOM_TTL),
    redis.expire(roomRevKey(roomId), ROOM_TTL),
    redis.expire(roomUsersKey(roomId), ROOM_TTL),
    redis.expire(roomLangKey(roomId), ROOM_TTL),
  ]);
}

export function roomOpsKey(roomId: string) {
  return `room:${roomId}:ops`;
}

export async function pushOp(roomId: string, op: Operation) {
  await redis.rpush(roomOpsKey(roomId), JSON.stringify(op));
  await redis.expire(roomOpsKey(roomId), ROOM_TTL);
}

export async function getOpsSince(roomId: string, revision: number): Promise<Operation[]> {
  const raw = await redis.lrange(roomOpsKey(roomId), revision, -1);
  return raw.map((r) => JSON.parse(r) as Operation);
}

export function roomChatKey(roomId: string) {
  return `room:${roomId}:chat`;
}

export async function pushChatMessage(roomId: string, message: {
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}) {
  await redis.rpush(roomChatKey(roomId), JSON.stringify(message));
  await redis.ltrim(roomChatKey(roomId), -50, -1);
  await redis.expire(roomChatKey(roomId), ROOM_TTL);
}

export async function getChatHistory(roomId: string) {
  const raw = await redis.lrange(roomChatKey(roomId), 0, -1);
  return raw.map((r) => JSON.parse(r));
}

export default redis;