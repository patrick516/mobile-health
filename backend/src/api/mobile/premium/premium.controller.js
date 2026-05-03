// src/api/mobile/premium/premium.controller.js

import * as premiumService from "./premium.service.js";
import { success } from "../../../utils/response.js";

export const getStatus = async (req, res, next) => {
  try {
    const status = await premiumService.getStatus(req.user.id);
    return success(res, status);
  } catch (err) {
    next(err);
  }
};

export const subscribe = async (req, res, next) => {
  try {
    const result = await premiumService.subscribe(req.user.id, req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const result = await premiumService.verifyPayment(req.user.id, req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const cancel = async (req, res, next) => {
  try {
    await premiumService.cancel(req.user.id);
    return success(res, { message: "Subscription cancelled successfully" });
  } catch (err) {
    next(err);
  }
};
