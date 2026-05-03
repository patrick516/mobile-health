// src/api/mobile/conversations/conversations.controller.js

import * as conversationsService from "./conversations.service.js";
import { success, created } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await conversationsService.getConversations(
      req.user.id,
    );
    return success(res, { conversations });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await conversationsService.getUnreadCount(req.user.id);
    return success(res, { unreadCount: count });
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { before } = req.query;
    const messages = await conversationsService.getMessages(
      req.params.id,
      req.user.id,
      { skip, limit, before },
    );
    return success(res, { messages, page });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = await conversationsService.sendMessage(
      req.params.id,
      req.user.id,
      req.body.text,
    );
    return created(res, { message });
  } catch (err) {
    next(err);
  }
};

export const sendVoice = async (req, res, next) => {
  try {
    // req.file populated by multer
    const message = await conversationsService.sendVoice(
      req.params.id,
      req.user.id,
      req.file,
      req.body.duration,
    );
    return created(res, { message });
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req, res, next) => {
  try {
    await conversationsService.markRead(req.params.id, req.user.id);
    return success(res, { message: "Marked as read" });
  } catch (err) {
    next(err);
  }
};
