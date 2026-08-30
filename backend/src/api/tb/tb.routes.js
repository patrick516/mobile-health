import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  registerTbCase,
  getTbCases,
  getTbCase,
  recordDotVisit,
  closeTbCase,
} from "./tb.controller.js";

const router = Router();
router.use(authenticate);

router.post("/cases", registerTbCase);
router.get("/cases", getTbCases);
router.get("/cases/:id", getTbCase);
router.post("/cases/:id/dot", recordDotVisit);
router.patch("/cases/:id/outcome", closeTbCase);

export default router;
