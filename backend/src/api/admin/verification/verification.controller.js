// src/api/admin/verification/verification.controller.js

import * as verificationService from "./verification.service.js";
import { success } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const getAllVerifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const result = await verificationService.getAllVerifications({
      page,
      limit,
      skip,
      status: req.query.status,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getVerificationById = async (req, res, next) => {
  try {
    const verification = await verificationService.getVerificationById(
      req.params.id,
    );
    return success(res, { verification });
  } catch (err) {
    next(err);
  }
};

export const approveVerification = async (req, res, next) => {
  try {
    const result = await verificationService.approveVerification(
      req.params.id,
      req.admin.id,
    );
    return success(res, {
      ...result,
      message: "Verification approved and user notified",
    });
  } catch (err) {
    next(err);
  }
};

export const rejectVerification = async (req, res, next) => {
  try {
    const result = await verificationService.rejectVerification(
      req.params.id,
      req.admin.id,
      req.body.rejectionReason,
    );
    return success(res, {
      ...result,
      message: "Verification rejected and user notified",
    });
  } catch (err) {
    next(err);
  }
};
