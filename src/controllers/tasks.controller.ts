import type { Request, Response } from "express";
import { z } from "zod";
import * as tasksService from "../services/tasks.service.js";
const title = z
  .string()
  .trim()
  .min(1, "Название не должно быть короче 3 символов")
  .max(200, "Название не должно быть длиннее 200 символов");

const description = z
  .string()
  .trim()
  .max(5000, "Описание должно быть не длиннее 5000 символов");

const priority = z.enum(
  ["low", "medium", "high"],
  "Приоритет должен быть или low или medium или high",
);

const category = z
  .string()
  .trim()
  .max(50, "Категория должна быть не длиннее 50 символов")
  .nullable()
  .transform((value) => value || null);

const createTaskSchema = z.object({
  title,
  description: description.default(""),
  priority: priority.default("medium"),
  category: category.default(null),
});

// Тело PATCH /api/tasks/:id: те же поля, но все необязательные.
const updateTaskSchema = z
  .object({ title, description, priority, category })
  .partial();

// Параметры GET /api/tasks?page=1&limit=10&search=...&priority=high&category=Работа&sort=newest
// Параметры в адресе всегда приходят строками, z.coerce.number() превращает их в числа.
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  priority: priority.optional(),
  category: z.string().trim().optional(),
  sort: z.enum(["newest", "oldest", "title", "priority"]).default("newest"),
});

export async function list(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  const result = await tasksService.listTasks(req.userId!, query);
  res.json(result); // { tasks: [...], pagination: { page, limit, total, totalPages } }
}

export async function categories(req: Request, res: Response) {
  const categories = await tasksService.listCategories(req.userId!);
  res.json({ categories });
}

export async function create(req: Request, res: Response) {
  const input = createTaskSchema.parse(req.body);
  const task = await tasksService.createTask(req.userId!, input);
  res.status(201).json({ task });
}

export async function update(req: Request<{ id: string }>, res: Response) {
  const input = updateTaskSchema.parse(req.body);
  const task = await tasksService.updateTask(req.userId!, req.params.id, input);
  res.json({ task });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  await tasksService.deleteTask(req.userId!, req.params.id);
  res.status(204).end(); // 204 — успешно, тело ответа пустое
}
