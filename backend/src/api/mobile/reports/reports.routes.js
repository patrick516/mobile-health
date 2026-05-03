// src/api/mobile/reports/reports.routes.js

import { Router } from "express";
import {
  reportUser,
  blockUser,
  getBlocked,
  unblockUser,
} from "./reports.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.post(
  "/:id/report",
  authenticate,
  validate({ reason: "required" }),
  reportUser,
);
router.post("/:id/block", authenticate, blockUser);
router.get("/blocked", authenticate, getBlocked);
router.delete("/:id/block", authenticate, unblockUser);

export default router;
