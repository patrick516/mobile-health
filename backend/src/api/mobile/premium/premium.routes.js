// src/api/mobile/premium/premium.routes.js

import { Router } from "express";
import {
  getStatus,
  subscribe,
  verifyPayment,
  cancel,
} from "./premium.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.get("/status", authenticate, getStatus);
router.post(
  "/subscribe",
  authenticate,
  validate({ plan: "required", payment_method: "required" }),
  subscribe,
);
router.post(
  "/verify-payment",
  authenticate,
  validate({ session_id: "required", transaction_ref: "required" }),
  verifyPayment,
);
router.post("/cancel", authenticate, cancel);

export default router;
