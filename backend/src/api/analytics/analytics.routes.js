import { Router } from "express";
import {
  getTrends,
  getChwActivity,
  getOverview,
} from "./analytics.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/overview", getOverview);
router.get("/trends", getTrends);
router.get("/chw-activity", getChwActivity);

export default router;
