import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { readDb, updateDb } from "../db.js";
import type { User } from "../types.js";
import { HttpError } from "../utils/httpError.js";

export type PublicUser = Omit<User, "passwordHash">;

function toPublic(user: User): PublicUser {
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function register(email: string, password: string): Promise<PublicUser> {
  const normalized = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await updateDb((db) => {
    if (db.users.some((u) => u.email === normalized)) {
      throw new HttpError(409, "Пользователь с таким email уже существует");
    }
    const created: User = {
      id: randomUUID(),
      email: normalized,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.users.push(created);
    return created;
  });

  return toPublic(user);
}

export async function login(email: string, password: string): Promise<PublicUser> {
  const db = await readDb();
  const user = db.users.find((u) => u.email === normalizeEmail(email));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Неверный email или пароль");
  }
  return toPublic(user);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const db = await readDb();
  const user = db.users.find((u) => u.id === id);
  return user ? toPublic(user) : null;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, config.jwtSecret);
  if (typeof payload === "string" || !payload.sub) throw new Error("Invalid token payload");
  return payload.sub;
}
