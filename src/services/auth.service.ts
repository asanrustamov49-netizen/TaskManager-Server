// Логика авторизации: регистрация, вход, создание и проверка JWT.

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { readDb, updateDb } from "../db.js";
import type { User } from "../types.js";
import { HttpError } from "../utils/httpError.js";

// Пользователь без хеша пароля. Только его можно отправлять клиенту.
export type PublicUser = Omit<User, "passwordHash">;

function toPublic(user: User): PublicUser {
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

// "  Ivan@Mail.ru " и "ivan@mail.ru" — один и тот же email.
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function register(email: string, password: string): Promise<PublicUser> {
  const normalized = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await updateDb((db) => {
    // Проверка внутри updateDb: так две одновременные регистрации с одним email не пройдут обе.
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
  // Одинаковое сообщение для «нет такого email» и «неверный пароль»,
  // чтобы по ответу нельзя было узнать, зарегистрирован ли email.
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

// Создаёт JWT, внутри которого хранится id пользователя (поле sub).
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Возвращает id пользователя из JWT. Бросает ошибку, если токен подделан или истёк.
export function verifyToken(token: string): string {
  const payload = jwt.verify(token, config.jwtSecret);
  if (typeof payload === "string" || !payload.sub) throw new Error("Invalid token payload");
  return payload.sub;
}
