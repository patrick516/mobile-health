import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  generatePncSchedule,
  getPncSchedules,
  recordPncVisit,
  getMemberPncVisits,
} from "./pnc.controller.js";

const router = Router();
router.use(authenticate);

// Generate PNC schedule when delivery is recorded
router.post("/generate/:memberId", generatePncSchedule);

// List schedules (scoped to user's zone/district)
router.get("/schedules", getPncSchedules);

// All PNC visits for one member
router.get("/member/:memberId", getMemberPncVisits);

// Record an actual PNC visit
router.patch("/:id/record", recordPncVisit);

export default router;
