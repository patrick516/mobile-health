// src/api/mobile/matches/matches.routes.js

import { Router } from "express";
import {
  getMatches,
  getLikesReceived,
  getLikesSent,
} from "./matches.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requirePremium } from "../../../middleware/premium.middleware.js";

const router = Router();

router.get("/", authenticate, getMatches);
router.get("/likes/received", authenticate, requirePremium, getLikesReceived);
router.get("/likes/sent", authenticate, getLikesSent);

export default router;
