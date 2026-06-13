import { Router } from "express";
import { getAncSchedules } from "./anc.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/schedules", getAncSchedules);

export default router;
