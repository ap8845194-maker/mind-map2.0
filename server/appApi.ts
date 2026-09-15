import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Express, Request, Response, NextFunction } from "express";
import { jwtVerify, SignJWT } from "jose";
import {
  createAppUser,
  createMessage,
  createMood,
  createStudySession,
  getAdminCounts,
  getAppUserByEmail,
  getAppUserById,
  listMoods,
  listStudySessions,
} from "./db";
import { ENV } from "./_core/env";

const scrypt = promisify(scryptCallback);
const TOKEN_TTL = "7d";
const secret = () => new TextEncoder().encode(ENV.cookieSecret || "mind-mirror-local-development-secret");

type AuthenticatedRequest = Request & { appUser?: { id: number; name: string; email: string; role: "user" | "admin" } };

function publicUser(user: { id: number; name: string; email: string; role: "user" | "admin" }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

async function issueToken(user: { id: number; name: string; email: string; role: "user" | "admin" }) {
  return new SignJWT(publicUser(user))
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret());
}

function tokenFromRequest(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)mind_mirror_session=([^;]+)/);
  return match?.[1];
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = tokenFromRequest(req);
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
    const { payload } = await jwtVerify(token, secret());
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) throw new Error("Invalid user");
    const user = await getAppUserById(userId);
    if (!user) throw new Error("User not found");
    req.appUser = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.appUser?.role !== "admin") return res.status(403).json({ success: false, message: "Admin access required" });
  next();
}

function text(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function registerAppApi(app: Express) {
  app.get("/api/health", (_req, res) => res.json({ success: true, service: "mind-mirror-api" }));

  app.post("/api/auth/register", async (req, res) => {
    try {
      const name = text(req.body?.name, 120);
      const email = text(req.body?.email, 320).toLowerCase();
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!name || !email || password.length < 8) {
        return res.status(400).json({ success: false, message: "Name, valid email, and an 8-character password are required" });
      }
      if (await getAppUserByEmail(email)) return res.status(409).json({ success: false, message: "User already exists" });
      const created = await createAppUser({ name, email, passwordHash: await hashPassword(password) });
      if (!created) throw new Error("Unable to create user");
      const user = publicUser(created);
      return res.status(201).json({ success: true, message: "Account created successfully", user, token: await issueToken(user) });
    } catch (error) {
      console.error("[Auth] register failed", error);
      return res.status(500).json({ success: false, message: "Unable to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = text(req.body?.email, 320).toLowerCase();
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const user = await getAppUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      const safeUser = publicUser(user);
      return res.json({ success: true, message: "Login successful", user: safeUser, token: await issueToken(safeUser) });
    } catch (error) {
      console.error("[Auth] login failed", error);
      return res.status(500).json({ success: false, message: "Unable to sign in" });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ success: true, user: req.appUser });
  });

  app.post("/api/auth/logout", (_req, res) => res.json({ success: true }));

  app.post("/api/data/moods", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const mood = text(req.body?.mood, 40);
      const moodDate = text(req.body?.date, 20);
      const moodTime = text(req.body?.time, 40);
      if (!mood || !moodDate || !moodTime || !req.appUser) return res.status(400).json({ success: false, message: "Mood data is incomplete" });
      const data = await createMood({ userId: req.appUser.id, mood, moodDate, moodTime });
      res.status(201).json({ success: true, data });
    } catch (error) {
      console.error("[Data] mood failed", error);
      res.status(500).json({ success: false, message: "Unable to save mood" });
    }
  });

  app.get("/api/data/moods", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const data = await listMoods(req.appUser!.id);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[Data] moods failed", error);
      res.status(500).json({ success: false, message: "Unable to load moods" });
    }
  });

  app.post("/api/data/study", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const task = text(req.body?.task, 500);
      const minutes = Number(req.body?.minutes);
      const mood = text(req.body?.mood, 40) || "Normal";
      const sessionDate = text(req.body?.date, 20);
      if (!task || !Number.isFinite(minutes) || minutes <= 0 || !sessionDate || !req.appUser) return res.status(400).json({ success: false, message: "Study session data is incomplete" });
      const data = await createStudySession({ userId: req.appUser.id, task, minutes: Math.round(minutes), mood, sessionDate });
      res.status(201).json({ success: true, data });
    } catch (error) {
      console.error("[Data] study failed", error);
      res.status(500).json({ success: false, message: "Unable to save study session" });
    }
  });

  app.get("/api/data/study", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const data = await listStudySessions(req.appUser!.id);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[Data] study failed", error);
      res.status(500).json({ success: false, message: "Unable to load study sessions" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const name = text(req.body?.name, 120);
      const email = text(req.body?.email, 320).toLowerCase();
      const message = text(req.body?.message, 5000);
      if (!name || !email || !message) return res.status(400).json({ success: false, message: "Name, email, and message are required" });
      const data = await createMessage({ name, email, message });
      res.status(201).json({ success: true, message: "Message sent successfully", data });
    } catch (error) {
      console.error("[Messages] create failed", error);
      res.status(500).json({ success: false, message: "Unable to send message" });
    }
  });

  app.get("/api/admin/dashboard", requireAuth, requireAdmin, async (_req, res) => {
    try {
      res.json({ success: true, dashboard: await getAdminCounts() });
    } catch (error) {
      console.error("[Admin] dashboard failed", error);
      res.status(500).json({ success: false, message: "Unable to load dashboard" });
    }
  });
}
