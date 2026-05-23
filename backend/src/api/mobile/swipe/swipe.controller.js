// src/api/mobile/swipe/swipe.controller.js

import * as swipeService from "./swipe.service.js";
import { success } from "../../../utils/response.js";

export const likeUser = async (req, res, next) => {
  try {
    const result = await swipeService.likeUser(req.user.id, req.params.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const passUser = async (req, res, next) => {
  try {
    await swipeService.passUser(req.user.id, req.params.id);
    return success(res, { message: "Passed" });
  } catch (err) {
    next(err);
  }
};

export const getLikes = async (req, res, next) => {
  try {
    const users = await swipeService.getLikes(req.user.id);
    return success(res, { users, total: users.length });
  } catch (err) {
    next(err);
  }
};

export const rewind = async (req, res, next) => {
  try {
    const result = await swipeService.rewind(req.user.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};
