// src/api/mobile/notifications/notifications.controller.js

import * as notificationsService from "./notifications.service.js";
import { success } from "../../../utils/response.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationsService.getNotifications(
      req.user.id,
    );
    return success(res, { notifications });
  } catch (err) {
    next(err);
  }
};

export const markOneRead = async (req, res, next) => {
  try {
    await notificationsService.markOneRead(req.params.id, req.user.id);
    return success(res, { message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await notificationsService.markAllRead(req.user.id);
    return success(res, { message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

export const registerPushToken = async (req, res, next) => {
  try {
    await notificationsService.registerPushToken(req.user.id, req.body);
    return success(res, { message: "Push token registered successfully" });
  } catch (err) {
    next(err);
  }
};
