// src/api/admin/photos/photos.controller.js

import * as photosService from "./photos.service.js";
import { success } from "../../../utils/response.js";

export const getUserPhotos = async (req, res, next) => {
  try {
    const photos = await photosService.getUserPhotos(req.params.userId);
    return success(res, { photos });
  } catch (err) {
    next(err);
  }
};

export const removePhoto = async (req, res, next) => {
  try {
    await photosService.removePhoto(req.params.photoId, req.admin.id);
    return success(res, { message: "Photo removed successfully" });
  } catch (err) {
    next(err);
  }
};
