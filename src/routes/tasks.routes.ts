// Адреса /api/tasks/*. Все они требуют входа (requireAuth).

import { Router } from "express";
import * as tasksController from "../controllers/tasks.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/", tasksController.list); // список с поиском, фильтрами, сортировкой, пагинацией
tasksRouter.get("/categories", tasksController.categories); // категории пользователя
tasksRouter.post("/", tasksController.create);
tasksRouter.patch("/:id", tasksController.update);
tasksRouter.delete("/:id", tasksController.remove);
