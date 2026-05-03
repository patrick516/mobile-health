import { Router } from "express";
import { getAnalytics } from "./analytics.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";

const router = Router();

router.get("/", authenticateAdmin, getAnalytics);

export default router;
