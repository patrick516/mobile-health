// src/api/mobile/preferences/preferences.routes.js

import { Router } from "express";
import { getPreferences, updatePreferences } from "./preferences.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getPreferences);
router.patch("/", authenticate, updatePreferences);

export default router;
