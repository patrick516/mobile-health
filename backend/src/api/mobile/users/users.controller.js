import * as usersService from "./users.service.js";
import { success, error } from "../../../utils/response.js";

export const getMe = async (req, res, next) => {
  try {
    const user = await usersService.getMe(req.user.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await usersService.updateMe(req.user.id, req.body);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

export const updateLifestyle = async (req, res, next) => {
  try {
    const lifestyle = await usersService.updateLifestyle(req.user.id, req.body);
    return success(res, { lifestyle });
  } catch (err) {
    next(err);
  }
};

export const updateInterests = async (req, res, next) => {
  try {
    const user = await usersService.updateInterests(
      req.user.id,
      req.body.interests,
    );
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id, req.user.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

export const deleteMe = async (req, res, next) => {
  try {
    await usersService.deleteMe(req.user.id);
    return success(res, { message: "Account deleted successfully" });
  } catch (err) {
    next(err);
  }
};
