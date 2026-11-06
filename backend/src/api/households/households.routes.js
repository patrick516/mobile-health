import { Router } from "express";
import {
  getHouseholds,
  getHousehold,
  createHousehold,
  updateHousehold,
  relocateSameZone,
  relocateNewZone,
  linkRelocation,
  getRelocatedHouseholds,
} from "./households.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();

router.use(authenticate);

router.get(
  "/relocated",
  role("ADMIN", "SUPER_ADMIN", "DISTRICT_OFFICER"),
  getRelocatedHouseholds,
);
router.get("/", getHouseholds);
router.get("/:id", getHousehold);
router.post("/", createHousehold);
router.patch("/:id", updateHousehold);
router.patch("/:id/relocate-same-zone", relocateSameZone);
router.patch("/:id/relocate-new-zone", relocateNewZone);
router.patch(
  "/:id/link-relocation",
  role("ADMIN", "SUPER_ADMIN", "DISTRICT_OFFICER"),
  linkRelocation,
);
export default router;
