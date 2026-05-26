import { Router } from "express";
import { getMapEvents } from "./map.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);
router.get("/events", getMapEvents);

export default router;
