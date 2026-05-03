// src/api/admin/auth/auth.routes.js

import { Router } from "express";
import { adminLogin, adminMe } from "./auth.controller.js";
import { authLimiter } from "../../../middleware/rateLimit.middleware.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.post(
  "/login",
  authLimiter,
  validate({ email: "required", password: "required" }),
  adminLogin,
);
router.get("/me", authenticateAdmin, adminMe);

export default router;
