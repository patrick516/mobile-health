// src/api/admin/reports/reports.routes.js

import { Router } from "express";
import {
  getAllReports,
  getReportById,
  markReviewing,
  resolveReport,
} from "./reports.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.get("/", authenticateAdmin, getAllReports);
router.get("/:id", authenticateAdmin, getReportById);
router.patch("/:id/reviewing", authenticateAdmin, markReviewing);
router.patch(
  "/:id/resolve",
  authenticateAdmin,
  validate({ adminReply: "required" }),
  resolveReport,
);

export default router;
