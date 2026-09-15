import { count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  appUsers,
  messages,
  moods,
  studySessions,
  type AppUser,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAppUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);
  return result[0];
}

export async function getAppUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
  return result[0];
}

export async function createAppUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.insert(appUsers).values(data);
  const id = Number(result[0].insertId);
  return getAppUserById(id);
}

export async function createMood(data: {
  userId: number;
  mood: string;
  moodDate: string;
  moodTime: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.insert(moods).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function listMoods(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.select().from(moods).where(eq(moods.userId, userId)).orderBy(desc(moods.createdAt)).limit(500);
}

export async function createStudySession(data: {
  userId: number;
  task: string;
  minutes: number;
  mood: string;
  sessionDate: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.insert(studySessions).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function listStudySessions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.select().from(studySessions).where(eq(studySessions.userId, userId)).orderBy(desc(studySessions.createdAt)).limit(500);
}

export async function createMessage(data: { name: string; email: string; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.insert(messages).values(data);
  return { id: Number(result[0].insertId), ...data, status: "new" as const };
}

export async function getAdminCounts() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const [userCount] = await db.select({ count: count() }).from(appUsers);
  const [messageCount] = await db.select({ count: count() }).from(messages);
  const [newMessageCount] = await db.select({ count: count() }).from(messages).where(eq(messages.status, "new"));
  return {
    users: Number(userCount?.count ?? 0),
    messages: Number(messageCount?.count ?? 0),
    newMessages: Number(newMessageCount?.count ?? 0),
  };
}
