// app/routes.ts

import { Router } from "express";
import * as QuestionController from "../controllers/QuestionController";
import * as AdminController from "../controllers/AdminController";
import { requireRole } from "../middleware/auth";

const r = Router();

// Read
r.get("/questions/:id", QuestionController.getById);
r.get("/questions", )