import { Router } from "express";
import {
  getVisits,
  getVisit,
  createVisit,
  getOutbreakAlerts,
  resolveOutbreakAlert,
} from "./visits.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", getVisits);
router.get("/:id", getVisit);
router.post("/", createVisit);
router.get("/outbreak-alerts", getOutbreakAlerts);
router.patch("/outbreak-alerts/:id/resolve", resolveOutbreakAlert);

export default router;
