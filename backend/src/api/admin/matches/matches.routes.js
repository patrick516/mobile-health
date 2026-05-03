// src/api/admin/matches/matches.routes.js

import { Router } from "express";
import {
  getAllMatches,
  createManualMatch,
  dissolveMatch,
} from "./matches.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

router.get("/", authenticateAdmin, getAllMatches);
router.post(
  "/",
  authenticateAdmin,
  validate({ user1Id: "required", user2Id: "required" }),
  createManualMatch,
);
router.delete("/:id", authenticateAdmin, dissolveMatch);

export default router;
