import * as authService from "./auth.service.js";
import { success, created, error } from "../../../utils/response.js";

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return created(res, result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh(req.user);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    return success(res, { message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    return success(res, {
      message: "If that email exists, a reset link has been sent",
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    return success(res, { message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};
