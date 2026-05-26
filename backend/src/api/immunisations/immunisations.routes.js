import { Router } from "express";
import {
  getSchedules,
  getDue,
  recordImmunisation,
} from "./immunisations.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/schedules", getSchedules);
router.get("/due", getDue);
router.post("/", recordImmunisation);

export default router;
