// src/api/admin/reports/reports.controller.js

import * as reportsService from "./reports.service.js";
import { success } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const getAllReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const result = await reportsService.getAllReports({
      page,
      limit,
      skip,
      status: req.query.status,
      reason: req.query.reason,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getReportById = async (req, res, next) => {
  try {
    const report = await reportsService.getReportById(req.params.id);
    return success(res, { report });
  } catch (err) {
    next(err);
  }
};

export const markReviewing = async (req, res, next) => {
  try {
    const report = await reportsService.markReviewing(
      req.params.id,
      req.admin.id,
    );
    return success(res, { report, message: "Report marked as reviewing" });
  } catch (err) {
    next(err);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    const report = await reportsService.resolveReport(
      req.params.id,
      req.admin.id,
      req.body.adminReply,
    );
    return success(res, {
      report,
      message: "Report resolved and email sent to reporter",
    });
  } catch (err) {
    next(err);
  }
};
