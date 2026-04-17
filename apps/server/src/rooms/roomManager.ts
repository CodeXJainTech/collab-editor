import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';
import redis, {
  roomDocKey,
  roomRevKey,
  roomUsersKey,
  roomLangKey,
  touchRoomTTL,
} from '../db/redis';
import type { User, Language, Room } from '@collab-editor/shared';

const USER_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#34D399',
  '#38BDB8', '#60A5FA', '#A78BFA', '#F472B6',
];

function pickColor(index: number) {
  return USER_COLORS[index % USER_COLORS.length];
}

export async function createRoom(language: Language = 'javascript'): Promise<Room> {
  try{
    const id = uuidv4();
    const now = Date.now();

    await prisma.room.create({
      data: {
        id,
        language,
        createdAt: now,
        lastActive: now,
      },
    });

    await redis.set(roomDocKey(id), '');
    await redis.set(roomRevKey(id), '0');
    await redis.set(roomLangKey(id), language);
    await touchRoomTTL(id);

    return { id, language, createdAt: now };
  }
  catch (err) {
    console.error('create room error', err);
    throw err;
  }
  
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const record = await prisma.room.findUnique({ where: { id: roomId } });
  if (!record) return null;
  return {
    id: record.id,
    language: record.language as Language,
    createdAt: Number(record.createdAt),
  };
}

export async function joinRoom(roomId: string, userId: string, username: string): Promise<{
  room: Room;
  doc: string;
  revision: number;
  users: User[];
} | null> {
  const room = await getRoom(roomId);
  if (!room) return null;

  const existingUsers = await getRoomUsers(roomId);
  const color = pickColor(existingUsers.length);

  const user: User = { id: userId, username, color };
  await redis.hset(roomUsersKey(roomId), userId, JSON.stringify(user));
  await touchRoomTTL(roomId);

  await prisma.room.update({
    where: { id: roomId },
    data: { lastActive: Date.now() },
  });

  const doc = (await redis.get(roomDocKey(roomId))) ?? '';
  const revision = parseInt((await redis.get(roomRevKey(roomId))) ?? '0', 10);
  const users = await getRoomUsers(roomId);
  const language = (await redis.get(roomLangKey(roomId))) as Language ?? 'javascript';
  room.language = language;

  return { room, doc, revision, users };
}

export async function leaveRoom(roomId: string, userId: string) {
  await redis.hdel(roomUsersKey(roomId), userId);
  await touchRoomTTL(roomId);
}

export async function getRoomUsers(roomId: string): Promise<User[]> {
  const hash = await redis.hgetall(roomUsersKey(roomId));
  if (!hash) return [];
  return Object.values(hash).map((v) => JSON.parse(v) as User);
}

export async function getRoomDoc(roomId: string) {
  const doc = (await redis.get(roomDocKey(roomId))) ?? '';
  const revision = parseInt((await redis.get(roomRevKey(roomId))) ?? '0', 10);
  return { doc, revision };
}