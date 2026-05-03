import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from "./auth.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { authLimiter } from "../../../middleware/rateLimit.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate({ name: "required", email: "required", password: "required" }),
  register,
);
router.post(
  "/login",
  authLimiter,
  validate({ email: "required", password: "required" }),
  login,
);
router.post("/refresh", authenticate, refresh);
router.post("/logout", authenticate, logout);
router.post(
  "/forgot-password",
  authLimiter,
  validate({ email: "required" }),
  forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate({ token: "required", password: "required" }),
  resetPassword,
);

export default router;
