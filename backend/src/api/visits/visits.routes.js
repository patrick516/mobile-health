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

// FIX: Put static routes BEFORE the /:id route
router.get("/outbreak-alerts", getOutbreakAlerts);
router.patch("/outbreak-alerts/:id/resolve", resolveOutbreakAlert);

router.get("/", getVisits);
router.post("/", createVisit);
router.get("/:id", getVisit);

export default router;
