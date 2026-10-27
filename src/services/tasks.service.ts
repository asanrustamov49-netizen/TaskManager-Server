// Логика работы с задачами: список (с поиском, фильтрами, сортировкой, пагинацией),
// создание, изменение, удаление. Проверка входных данных — в tasks.controller.ts.

import { randomUUID } from "node:crypto";
import { readDb, updateDb } from "../db.js";
import type { Task, TaskPriority } from "../types.js";
import { HttpError } from "../utils/httpError.js";

export interface TaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string | null;
}

export type TaskSort = "newest" | "oldest" | "title" | "priority";

export interface ListTasksQuery {
  page: number;
  limit: number;
  search?: string;
  priority?: TaskPriority;
  category?: string;
  sort: TaskSort;
}

export interface ListTasksResult {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number; // сколько задач подходит под фильтры (на всех страницах)
    totalPages: number;
  };
}

// Чужую задачу отвечаем как «не найдена» (404), а не «нет доступа» (403),
// чтобы нельзя было узнать, существует ли задача с таким id.
const notFound = () => new HttpError(404, "Задача не найдена");

// Чем больше число, тем важнее приоритет. Нужно для сортировки.
const priorityWeight: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

// Функции сравнения для Array.sort: отрицательное число — a идёт раньше b.
const sorters: Record<TaskSort, (a: Task, b: Task) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, "ru"),
  // Задачи с одинаковым приоритетом идут от новых к старым.
  priority: (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || sorters.newest(a, b),
};

export async function listTasks(userId: string, query: ListTasksQuery): Promise<ListTasksResult> {
  const db = await readDb();

  // 1. Только задачи этого пользователя.
  let tasks = db.tasks.filter((task) => task.userId === userId);

  // 2. Поиск по названию и описанию без учёта регистра.
  if (query.search) {
    const text = query.search.toLowerCase();
    tasks = tasks.filter(
      (task) => task.title.toLowerCase().includes(text) || task.description.toLowerCase().includes(text),
    );
  }

  // 3. Фильтры.
  if (query.priority) {
    tasks = tasks.filter((task) => task.priority === query.priority);
  }
  if (query.category) {
    tasks = tasks.filter((task) => task.category === query.category);
  }

  // 4. Сортировка. filter() выше уже создал новый массив, так что база не меняется.
  tasks.sort(sorters[query.sort]);

  // 5. Пагинация: вырезаем нужную страницу.
  const total = tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const start = (query.page - 1) * query.limit;
  const pageTasks = tasks.slice(start, start + query.limit);

  return {
    tasks: pageTasks,
    pagination: { page: query.page, limit: query.limit, total, totalPages },
  };
}

// Все категории пользователя без повторов, по алфавиту. Нужны для фильтра и подсказок в форме.
export async function listCategories(userId: string): Promise<string[]> {
  const db = await readDb();
  const categories = new Set<string>();
  for (const task of db.tasks) {
    if (task.userId === userId && task.category) categories.add(task.category);
  }
  return [...categories].sort((a, b) => a.localeCompare(b, "ru"));
}

export function createTask(userId: string, input: TaskInput): Promise<Task> {
  return updateDb((db) => {
    const task: Task = {
      id: randomUUID(),
      ...input,
      userId,
      createdAt: new Date().toISOString(),
    };
    db.tasks.push(task);
    return task;
  });
}

export function updateTask(userId: string, id: string, input: Partial<TaskInput>): Promise<Task> {
  return updateDb((db) => {
    const task = db.tasks.find((t) => t.id === id && t.userId === userId);
    if (!task) throw notFound();
    Object.assign(task, input); // переписываем только присланные поля
    return task;
  });
}

export function deleteTask(userId: string, id: string): Promise<void> {
  return updateDb((db) => {
    const index = db.tasks.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) throw notFound();
    db.tasks.splice(index, 1);
  });
}
