import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  login,
  loginWeb,
  getMe,
  changePin,
  completePinReset,
  flagLockout,
  unlockAccount,
  setupStatus,
  registerSuperAdmin,
  completePasswordReset,
} from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

// Brute-force protection (per IP). Successful requests don't count.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const webLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const pinResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
});

// Public routes
router.post("/login", loginLimiter, login);
router.post("/login-web", webLoginLimiter, loginWeb);
router.get("/setup-status", setupStatus);
router.post("/register-super-admin", registerSuperAdmin);
router.patch("/complete-pin-reset", pinResetLimiter, completePinReset);
router.post("/complete-pin-reset", pinResetLimiter, completePinReset);
router.post("/flag-lockout", flagLockout);

// Protected routes
router.get("/me", authenticate, getMe);
router.patch("/change-pin", authenticate, changePin);
router.patch("/complete-password-reset", authenticate, completePasswordReset);
router.patch("/unlock/:id", authenticate, unlockAccount);

export default router;
