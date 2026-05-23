import * as verificationService from "./verification.service.js";
import { success, created } from "../../../utils/response.js";

export const getMyVerification = async (req, res, next) => {
  try {
    const verification = await verificationService.getMyVerification(
      req.user.id,
    );
    return success(res, { verification });
  } catch (err) {
    next(err);
  }
};

export const submitVerification = async (req, res, next) => {
  try {
    if (!req.files?.document || !req.files?.selfie) {
      const err = new Error("Both document and selfie are required");
      err.statusCode = 400;
      throw err;
    }
    const verification = await verificationService.submitVerification(
      req.user.id,
      req.body.documentType,
      req.files.document[0].path,
      req.files.selfie[0].path,
    );
    return created(res, { verification });
  } catch (err) {
    next(err);
  }
};
