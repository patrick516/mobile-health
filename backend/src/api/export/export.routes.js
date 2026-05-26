import { Router } from "express";
import { exportDHIS2 } from "./export.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);
router.use(role("DISTRICT_OFFICER", "ADMIN"));
router.get("/dhis2", exportDHIS2);

export default router;
