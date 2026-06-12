import { Router } from "express";
import {
  getTrends,
  getChwActivity,
  getOverview,
  getSymptomTrends,
  getReferralStats,
  getMuacTrends,
  getImmunisationCoverage,
} from "./analytics.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/overview", getOverview);
router.get("/trends", getTrends);
router.get("/chw-activity", getChwActivity);
router.get("/symptom-trends", getSymptomTrends);
router.get("/referral-stats", getReferralStats);
router.get("/muac-trends", getMuacTrends);
router.get("/immunisation-coverage", getImmunisationCoverage);

export default router;
