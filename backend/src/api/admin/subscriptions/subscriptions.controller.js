// src/api/admin/subscriptions/subscriptions.controller.js

import * as subscriptionsService from "./subscriptions.service.js";
import { success } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const getAllSubscriptions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const result = await subscriptionsService.getAllSubscriptions({
      page,
      limit,
      skip,
      isActive: req.query.isActive,
      grantedByAdmin: req.query.grantedByAdmin,
      plan: req.query.plan,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getSubscriptionByUserId = async (req, res, next) => {
  try {
    const subscription = await subscriptionsService.getSubscriptionByUserId(
      req.params.userId,
    );
    return success(res, { subscription });
  } catch (err) {
    next(err);
  }
};
