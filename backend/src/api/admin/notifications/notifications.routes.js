// src/api/admin/notifications/notifications.routes.js

import { Router } from "express";
import { sendBroadcast, getBroadcasts } from "./notifications.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.get("/broadcasts", authenticateAdmin, getBroadcasts);
router.post(
  "/broadcast",
  authenticateAdmin,
  validate({ title: "required", body: "required" }),
  sendBroadcast,
);

export default router;
