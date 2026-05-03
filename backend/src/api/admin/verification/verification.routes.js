// src/api/admin/verification/verification.routes.js

import { Router } from "express";
import {
  getAllVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,
} from "./verification.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.get("/", authenticateAdmin, getAllVerifications);
router.get("/:id", authenticateAdmin, getVerificationById);
router.patch("/:id/approve", authenticateAdmin, approveVerification);
router.patch(
  "/:id/reject",
  authenticateAdmin,
  validate({ rejectionReason: "required" }),
  rejectVerification,
);

export default router;
