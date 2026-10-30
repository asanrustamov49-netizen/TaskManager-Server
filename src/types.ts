export type TaskPriority = "low" | "medium" | "high";

export interface User {
  id: string;
  email: string;
  passwordHash: string; 
  createdAt: string; 
}

export interface Task {
  id: string;
  title: string;
  description: string; 
  priority: TaskPriority;
  category: string | null; 
  userId: string; 
  createdAt: string;
}

export interface DbSchema {
  users: User[];
  tasks: Task[];
}
