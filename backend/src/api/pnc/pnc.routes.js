import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";
import {
  generatePncSchedule,
  getPncSchedules,
  recordPncVisit,
  getMemberPncVisits,
} from "./pnc.controller.js";

const router = Router();
router.use(authenticate);

// Generate PNC schedule when delivery is recorded
router.post(
  "/generate/:memberId",
  role("CCW", "NURSE", "ADMIN", "SUPER_ADMIN"),
  generatePncSchedule,
);

// List schedules (scoped to user's zone/district)
router.get("/schedules", getPncSchedules);

// All PNC visits for one member
router.get("/member/:memberId", getMemberPncVisits);

// Record an actual PNC visit
router.patch(
  "/:id/record",
  role("CCW", "NURSE", "ADMIN", "SUPER_ADMIN"),
  recordPncVisit,
);

export default router;
