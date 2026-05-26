import { Router } from "express";
import {
  getHouseholds,
  getHousehold,
  createHousehold,
  updateHousehold,
} from "./households.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getHouseholds);
router.get("/:id", getHousehold);
router.post("/", createHousehold);
router.patch("/:id", updateHousehold);

export default router;
