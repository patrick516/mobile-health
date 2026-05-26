import { Router } from "express";
import { login, getMe, changePin } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, getMe);
router.patch("/change-pin", authenticate, changePin);

export default router;
