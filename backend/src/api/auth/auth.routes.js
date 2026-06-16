import { Router } from "express";
import {
  login,
  getMe,
  changePin,
  flagLockout,
  unlockAccount,
} from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, getMe);
router.patch("/change-pin", authenticate, changePin);
router.post("/flag-lockout", flagLockout);
router.patch("/unlock/:id", authenticate, unlockAccount);

export default router;
