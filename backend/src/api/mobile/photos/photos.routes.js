import { Router } from "express";
import {
  uploadPhoto,
  getMyPhotos,
  deletePhoto,
  setMainPhoto,
} from "./photos.controller.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { upload } from "../../../config/cloudinary.js";

const router = Router();

router.get("/", authenticate, getMyPhotos);
router.post("/", authenticate, upload.single("photo"), uploadPhoto);
router.delete("/:id", authenticate, deletePhoto);
router.patch("/:id/main", authenticate, setMainPhoto);

export default router;
