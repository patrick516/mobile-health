import { Router } from "express";
import {
  getMe,
  updateMe,
  updateLifestyle,
  updateInterests,
  getUserById,
  deleteMe,
} from "./users.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";

const router = Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);
router.patch("/me/lifestyle", authenticate, updateLifestyle);
router.patch("/me/interests", authenticate, updateInterests);
router.delete("/me", authenticate, deleteMe);
router.get("/:id", authenticate, getUserById);

export default router;
