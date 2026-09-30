import { Router } from "express";
import { exportDHIS2 } from "./export.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);

// SUPER_ADMIN can export country-wide or per-district; ADMIN is auto-scoped
// to their facility; DISTRICT_OFFICER auto-scoped to their district.
router.use(role("SUPER_ADMIN", "ADMIN", "DISTRICT_OFFICER"));

router.get("/dhis2", exportDHIS2);

export default router;
