// src/api/admin/dashboard/dashboard.routes.js

import { Router } from "express";
import { getStats } from "./dashboard.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";

const router = Router();

router.get("/stats", authenticateAdmin, getStats);

export default router;
