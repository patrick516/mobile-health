import { Router } from "express";
import { getVisits, getVisit, createVisit } from "./visits.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", getVisits);
router.get("/:id", getVisit);
router.post("/", createVisit);

export default router;
