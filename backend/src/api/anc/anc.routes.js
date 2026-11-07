import { Router } from "express";
import { getAncSchedules, recordAncVisit } from "./anc.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);

router.get("/schedules", getAncSchedules);

// Record an actual ANC contact (nurse-triggered attendance)
router.patch(
  "/:id/record",
  role("CCW", "NURSE", "DISTRICT_OFFICER", "ADMIN", "SUPER_ADMIN"),
  recordAncVisit,
);

export default router;
