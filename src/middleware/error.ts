// Общий обработчик ошибок. Express вызывает его, когда любой обработчик бросает ошибку.
// Ответ всегда в виде { error: "текст для пользователя" }.

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

// Express отличает обработчик ошибок по четырём аргументам, поэтому `_next` нужен, хоть и не используется.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Ошибка, которую мы бросили сами: throw new HttpError(404, "Задача не найдена").
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Данные не прошли проверку Zod. Показываем первую ошибку, в `issues` — все подробности.
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Некорректные данные";
    res.status(400).json({ error: message, issues: err.issues });
    return;
  }

  // Что-то непредвиденное: пишем подробности в консоль сервера, пользователю — общий текст.
  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
}
