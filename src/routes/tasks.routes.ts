import { Router } from "express";
import * as tasksController from "../controllers/tasks.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/", tasksController.list); 
tasksRouter.get("/categories", tasksController.categories); 
tasksRouter.post("/", tasksController.create);
tasksRouter.patch("/:id", tasksController.update);
tasksRouter.delete("/:id", tasksController.remove);
