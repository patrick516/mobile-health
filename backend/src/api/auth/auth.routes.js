import { Router } from "express";
import {
  login,
  getMe,
  changePin,
  completePinReset,
  flagLockout,
  unlockAccount,
} from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, getMe);
router.patch("/change-pin", authenticate, changePin);
router.patch("/complete-pin-reset", completePinReset);
router.post("/complete-pin-reset", completePinReset);
router.post("/flag-lockout", flagLockout);
router.patch("/unlock/:id", authenticate, unlockAccount);

export default router;
