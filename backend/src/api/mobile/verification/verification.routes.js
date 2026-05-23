import { Router } from "express";
import {
  getMyVerification,
  submitVerification,
} from "./verification.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { upload } from "../../../config/cloudinary.js";

const router = Router();

router.get("/", authenticate, getMyVerification);
router.post(
  "/",
  authenticate,
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  submitVerification,
);

export default router;
