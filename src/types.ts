// Типы данных, которые хранятся в базе (backend/data/db.json).

export type TaskPriority = "low" | "medium" | "high";

export interface User {
  id: string;
  email: string;
  passwordHash: string; // сам пароль никогда не хранится, только его bcrypt-хеш
  createdAt: string; // дата в формате ISO, например "2026-10-07T08:57:59.465Z"
}

export interface Task {
  id: string;
  title: string;
  description: string; // пустая строка, если описания нет
  priority: TaskPriority;
  category: string | null; // null — задача без категории
  userId: string; // владелец задачи
  createdAt: string;
}

// Вся база целиком: два списка.
export interface DbSchema {
  users: User[];
  tasks: Task[];
}
