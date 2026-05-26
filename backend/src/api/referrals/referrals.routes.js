import { Router } from "express";
import {
  getReferrals,
  getReferral,
  createReferral,
  updateReferral,
} from "./referrals.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);

router.get("/", getReferrals);
router.get("/:id", getReferral);
router.post("/", createReferral);
router.patch("/:id", updateReferral); // Nurse only — update status + feedback

export default router;
