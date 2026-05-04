import * as photosService from "./photos.service.js";
import { success, created } from "../../../utils/response.js";

export const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error("No file uploaded");
      err.statusCode = 400;
      throw err;
    }
    const photo = await photosService.uploadPhoto(
      req.user.id,
      req.file.path,
      req.body.isMain === "true",
    );
    return created(res, { photo });
  } catch (err) {
    next(err);
  }
};

export const getMyPhotos = async (req, res, next) => {
  try {
    const photos = await photosService.getMyPhotos(req.user.id);
    return success(res, { photos });
  } catch (err) {
    next(err);
  }
};

export const deletePhoto = async (req, res, next) => {
  try {
    await photosService.deletePhoto(req.user.id, req.params.id);
    return success(res, { message: "Photo deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const setMainPhoto = async (req, res, next) => {
  try {
    const photo = await photosService.setMainPhoto(req.user.id, req.params.id);
    return success(res, { photo });
  } catch (err) {
    next(err);
  }
};
