import { Router } from "express";
import {
  getHouseholdReport,
  getReferralReport,
  getVisitReport,
  getImmunisationReport,
  exportReportExcel,
  exportReportPDF,
} from "./reports.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/households", getHouseholdReport);
router.get("/referrals", getReferralReport);
router.get("/visits", getVisitReport);
router.get("/immunisations", getImmunisationReport);
router.get("/export/excel", exportReportExcel);
router.get("/export/pdf", exportReportPDF);

export default router;
