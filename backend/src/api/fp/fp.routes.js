import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  recordFpVisit,
  getFpVisits,
  getFpFollowUps,
  getMemberFpHistory,
} from "./fp.controller.js";

const router = Router();
router.use(authenticate);

router.post("/visits", recordFpVisit);
router.get("/visits", getFpVisits);
router.get("/follow-ups", getFpFollowUps);
router.get("/member/:memberId", getMemberFpHistory);

export default router;
