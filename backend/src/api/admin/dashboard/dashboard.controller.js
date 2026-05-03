// src/api/admin/dashboard/dashboard.controller.js

import * as dashboardService from "./dashboard.service.js";
import { success } from "../../../utils/response.js";

export const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats();
    return success(res, { stats });
  } catch (err) {
    next(err);
  }
};
