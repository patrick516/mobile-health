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

const router = Router();

router.use(authenticate);

router.get("/relocated", getRelocatedHouseholds);
router.get("/", getHouseholds);
router.get("/:id", getHousehold);
router.post("/", createHousehold);
router.patch("/:id", updateHousehold);
router.patch("/:id/relocate-same-zone", relocateSameZone);
router.patch("/:id/relocate-new-zone", relocateNewZone);
router.patch("/:id/link-relocation", linkRelocation);
export default router;
