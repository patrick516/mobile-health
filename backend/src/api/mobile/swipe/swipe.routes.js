// src/api/mobile/swipe/swipe.routes.js

import { Router } from "express";
import { likeUser, passUser, rewind, getLikes } from "./swipe.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requirePremium } from "../../../middleware/premium.middleware.js";

const router = Router();

router.post("/like/:id", authenticate, likeUser);
router.post("/pass/:id", authenticate, passUser);
router.post("/rewind", authenticate, requirePremium, rewind);
router.get("/likes", authenticate, getLikes);

export default router;
