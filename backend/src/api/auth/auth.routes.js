import { Router } from "express";
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

// Public routes
router.post("/login", login);
router.post("/login-web", loginWeb);
router.get("/setup-status", setupStatus);
router.post("/register-super-admin", registerSuperAdmin);
router.patch("/complete-pin-reset", completePinReset);
router.post("/complete-pin-reset", completePinReset);
router.post("/flag-lockout", flagLockout);

// Protected routes
router.get("/me", authenticate, getMe);
router.patch("/change-pin", authenticate, changePin);
router.patch("/complete-password-reset", authenticate, completePasswordReset);
router.patch("/unlock/:id", authenticate, unlockAccount);

export default router;
