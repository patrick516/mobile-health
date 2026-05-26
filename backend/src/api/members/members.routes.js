import { Router } from "express";
import {
  getMembers,
  getMember,
  createMember,
  updateMember,
} from "./members.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", getMembers);
router.get("/:id", getMember);
router.post("/", createMember);
router.patch("/:id", updateMember);

export default router;
