// src/api/mobile/conversations/conversations.routes.js

import { Router } from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
  sendVoice,
  markRead,
  getUnreadCount,
} from "./conversations.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requirePremium } from "../../../middleware/premium.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.get("/", authenticate, getConversations);
router.get("/unread-count", authenticate, getUnreadCount);
router.get("/:id/messages", authenticate, getMessages);
router.post(
  "/:id/messages",
  authenticate,
  validate({ text: "required" }),
  sendMessage,
);
router.post("/:id/voice", authenticate, requirePremium, sendVoice);
router.patch("/:id/read", authenticate, markRead);

export default router;
