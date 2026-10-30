import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth.service.js";
import { HttpError } from "../utils/httpError.js";

export const AUTH_COOKIE = "token";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  if (typeof token !== "string") throw new HttpError(401, "Требуется авторизация");

  try {
    req.userId = verifyToken(token);
  } catch {
    throw new HttpError(401, "Сессия недействительна, войдите снова");
  }

  next(); 
}
