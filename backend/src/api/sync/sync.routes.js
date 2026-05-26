import { Router } from "express";
import { syncBatch } from "./sync.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);
router.post("/", syncBatch);

export default router;
