// src/api/mobile/notifications/notifications.routes.js

import { Router } from "express";
import {
  getNotifications,
  markOneRead,
  markAllRead,
  registerPushToken,
} from "./notifications.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.get("/", authenticate, getNotifications);
router.patch("/read-all", authenticate, markAllRead);
router.patch("/:id/read", authenticate, markOneRead);
router.post(
  "/push-token",
  authenticate,
  validate({ token: "required", platform: "required" }),
  registerPushToken,
);

export default router;
