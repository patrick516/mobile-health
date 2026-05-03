import * as analyticsService from "./analytics.service.js";
import { success } from "../../../utils/response.js";

export const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getAnalytics();
    return success(res, { analytics });
  } catch (err) {
    next(err);
  }
};
