// src/api/mobile/reports/reports.controller.js

import * as reportsService from "./reports.service.js";
import { success } from "../../../utils/response.js";

export const reportUser = async (req, res, next) => {
  try {
    await reportsService.reportUser(req.user.id, req.params.id, req.body);
    return success(res, {
      message: "Report submitted. Our team will review it.",
    });
  } catch (err) {
    next(err);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    await reportsService.blockUser(req.user.id, req.params.id);
    return success(res, { message: "User blocked successfully" });
  } catch (err) {
    next(err);
  }
};

export const getBlocked = async (req, res, next) => {
  try {
    const blocked = await reportsService.getBlocked(req.user.id);
    return success(res, { blocked });
  } catch (err) {
    next(err);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    await reportsService.unblockUser(req.user.id, req.params.id);
    return success(res, { message: "User unblocked successfully" });
  } catch (err) {
    next(err);
  }
};
