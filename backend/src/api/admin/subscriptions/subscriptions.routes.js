// src/api/admin/subscriptions/subscriptions.routes.js

import { Router } from "express";
import {
  getAllSubscriptions,
  getSubscriptionByUserId,
} from "./subscriptions.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";

const router = Router();

router.get("/", authenticateAdmin, getAllSubscriptions);
router.get("/:userId", authenticateAdmin, getSubscriptionByUserId);

export default router;
