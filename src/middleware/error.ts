import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Некорректные данные";
    res.status(400).json({ error: message, issues: err.issues });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
}
