import { Router } from "express";
import { getDiscover, getForYou } from "./discover.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getDiscover);
router.get("/for-you", authenticate, getForYou);

export default router;
