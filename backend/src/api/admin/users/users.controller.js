// src/api/admin/users/users.controller.js

import * as usersService from "./users.service.js";
import { success } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const result = await usersService.getAllUsers({
      page,
      limit,
      skip,
      filters: req.query,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

export const verifyUser = async (req, res, next) => {
  try {
    const user = await usersService.verifyUser(req.params.id);
    return success(res, { user, message: "User verified successfully" });
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const user = await usersService.suspendUser(
      req.params.id,
      req.body.days,
      req.body.reason,
    );
    return success(res, { user, message: "User suspended successfully" });
  } catch (err) {
    next(err);
  }
};

export const banUser = async (req, res, next) => {
  try {
    const user = await usersService.banUser(req.params.id, req.body.reason);
    return success(res, { user, message: "User banned successfully" });
  } catch (err) {
    next(err);
  }
};

export const unbanUser = async (req, res, next) => {
  try {
    const user = await usersService.unbanUser(req.params.id);
    return success(res, { user, message: "User unbanned successfully" });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await usersService.deleteUser(req.params.id);
    return success(res, { message: "User deleted permanently" });
  } catch (err) {
    next(err);
  }
};

export const grantPremium = async (req, res, next) => {
  try {
    const result = await usersService.grantPremium(
      req.params.id,
      req.body.plan,
      req.body.days,
    );
    return success(res, { ...result, message: "Premium granted successfully" });
  } catch (err) {
    next(err);
  }
};

export const revokePremium = async (req, res, next) => {
  try {
    await usersService.revokePremium(req.params.id);
    return success(res, { message: "Premium revoked successfully" });
  } catch (err) {
    next(err);
  }
};
