// src/api/mobile/search/search.routes.js

import { Router } from "express";
import { search } from "./search.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";

const router = Router();

// GET /api/mobile/search?q=john&page=1&limit=20
router.get("/", authenticate, search);

export default router;
