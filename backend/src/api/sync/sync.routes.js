import { Router } from "express";
import { syncBatch } from "./sync.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);
router.post("/", role("CCW"), syncBatch);

export default router;
