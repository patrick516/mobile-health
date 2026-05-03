// src/api/admin/auth/auth.controller.js

import * as authService from "./auth.service.js";
import { success } from "../../../utils/response.js";

export const adminLogin = async (req, res, next) => {
  try {
    const result = await authService.adminLogin(req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const adminMe = async (req, res, next) => {
  try {
    return success(res, { admin: req.admin });
  } catch (err) {
    next(err);
  }
};
