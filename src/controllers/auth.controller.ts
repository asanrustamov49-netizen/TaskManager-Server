// Обработчики /api/auth: регистрация, вход, выход, текущий пользователь.
// После входа или регистрации сервер кладёт JWT в httpOnly-cookie "token".
// JavaScript в браузере эту cookie не видит, но браузер сам отправляет её с каждым запросом.

import type { CookieOptions, Request, Response } from "express";
import { z } from "zod";
import { AUTH_COOKIE } from "../middleware/auth.js";
import * as authService from "../services/auth.service.js";
import { HttpError } from "../utils/httpError.js";

// Те же правила продублированы на фронтенде в frontend/src/features/auth/schemas.ts.
const credentialsSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен быть не короче 6 символов"),
});

const cookieOptions: CookieOptions = {
  httpOnly: true, // недоступна из JavaScript, защита от кражи через XSS
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production", // только по HTTPS в продакшене
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней в миллисекундах, как и срок JWT
};

function setAuthCookie(res: Response, userId: string) {
  res.cookie(AUTH_COOKIE, authService.signToken(userId), cookieOptions);
}

export async function register(req: Request, res: Response) {
  const { email, password } = credentialsSchema.parse(req.body);
  const user = await authService.register(email, password);
  setAuthCookie(res, user.id);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const { email, password } = credentialsSchema.parse(req.body);
  const user = await authService.login(email, password);
  setAuthCookie(res, user.id);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  // Чтобы браузер удалил cookie, параметры должны совпадать с теми, что были при установке (кроме maxAge).
  const { maxAge: _, ...clearOptions } = cookieOptions;
  res.clearCookie(AUTH_COOKIE, clearOptions);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getUserById(req.userId!);
  // Токен настоящий, но пользователя уже нет в базе (например, базу очистили).
  if (!user) throw new HttpError(401, "Пользователь не найден");
  res.json({ user });
}
