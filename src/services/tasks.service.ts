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
    total: number;
    totalPages: number;
  };
}

const notFound = () => new HttpError(404, "Задача не найдена");

const priorityWeight: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

const sorters: Record<TaskSort, (a: Task, b: Task) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, "ru"),
  priority: (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || sorters.newest(a, b),
};

export async function listTasks(userId: string, query: ListTasksQuery): Promise<ListTasksResult> {
  const db = await readDb();

  let tasks = db.tasks.filter((task) => task.userId === userId);

  if (query.search) {
    const text = query.search.toLowerCase();
    tasks = tasks.filter(
      (task) => task.title.toLowerCase().includes(text) || task.description.toLowerCase().includes(text),
    );
  }

  if (query.priority) {
    tasks = tasks.filter((task) => task.priority === query.priority);
  }
  if (query.category) {
    tasks = tasks.filter((task) => task.category === query.category);
  }

  tasks.sort(sorters[query.sort]);

  const total = tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const start = (query.page - 1) * query.limit;
  const pageTasks = tasks.slice(start, start + query.limit);

  return {
    tasks: pageTasks,
    pagination: { page: query.page, limit: query.limit, total, totalPages },
  };
}

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
    Object.assign(task, input); 
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
