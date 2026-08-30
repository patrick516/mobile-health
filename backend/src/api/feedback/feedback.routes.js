import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  sendFeedback,
  getMyFeedback,
  getUnreadCount,
  getCcwsForFeedback,
  getSentFeedback,
} from "./feedback.controller.js";

const router = Router();
router.use(authenticate);

router.post("/", sendFeedback);
router.get("/my", getMyFeedback);
router.get("/unread-count", getUnreadCount);
router.get("/ccws", getCcwsForFeedback);
router.get("/sent", getSentFeedback);

export default router;
