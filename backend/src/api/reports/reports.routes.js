import { Router } from "express";
import {
  getHouseholdReport,
  getReferralReport,
  getVisitReport,
  getImmunisationReport,
  exportReportExcel,
  exportReportPDF,
  getAncReport,
  getChildrenUnder5Report,
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
router.get("/anc", getAncReport);
router.get("/children-under-5", getChildrenUnder5Report);

export default router;
