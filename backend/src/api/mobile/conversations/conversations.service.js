// src/api/mobile/conversations/conversations.service.js

import prisma from "../../../config/db.js";
import { createNotification } from "../notifications/notifications.service.js";
import { getIO, isUserOnline } from "../../../config/socket.js";

export const getConversations = async (userId) => {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          participants: {
            where: { userId: { not: userId } },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  photoUrl: true,
                  online: true,
                  verified: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  return participants.map((p) => ({
    id: p.conversationId,
    participant: p.conversation.participants[0]?.user,
    lastMessage: p.conversation.messages[0]?.text || null,
    lastMessageAt: p.conversation.messages[0]?.createdAt || null,
    unreadCount: p.unreadCount,
  }));
};

export const getUnreadCount = async (userId) => {
  const result = await prisma.conversationParticipant.aggregate({
    where: { userId },
    _sum: { unreadCount: true },
  });
  return result._sum.unreadCount || 0;
};

export const getMessages = async (
  conversationId,
  userId,
  { skip, limit, before },
) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) {
    const err = new Error("Conversation not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.message.findMany({
    where: {
      conversationId,
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });
};

export const sendMessage = async (conversationId, senderId, text) => {
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId, type: "text", text },
    }),
    prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: senderId } },
      data: { unreadCount: { increment: 1 } },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Get sender name and other participant
  const [sender, otherParticipant] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { name: true } }),
    prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: senderId } },
    }),
  ]);

  if (otherParticipant) {
    // Emit via WebSocket if receiver is online — instant delivery
    if (isUserOnline(otherParticipant.userId)) {
      getIO()
        .to(`conversation:${conversationId}`)
        .emit("message:new", { conversationId, message });
    } else {
      // Receiver is offline — send push notification instead
      await createNotification(otherParticipant.userId, {
        type: "new_message",
        title: sender.name,
        body: text.length > 50 ? `${text.substring(0, 50)}...` : text,
        refMsgId: message.id,
      });
    }
  }

  return message;
};

export const sendVoice = async (conversationId, senderId, file, duration) => {
  if (!file) {
    const err = new Error("Audio file is required");
    err.statusCode = 400;
    throw err;
  }

  // TODO: upload to cloud storage and replace with CDN URL
  const voiceUri = file.path;

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: "voice",
        voiceUri,
        voiceDuration: Number(duration),
      },
    }),
    prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: senderId } },
      data: { unreadCount: { increment: 1 } },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  const [sender, otherParticipant] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { name: true } }),
    prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: senderId } },
    }),
  ]);

  if (otherParticipant) {
    if (isUserOnline(otherParticipant.userId)) {
      getIO()
        .to(`conversation:${conversationId}`)
        .emit("message:new", { conversationId, message });
    } else {
      await createNotification(otherParticipant.userId, {
        type: "new_message",
        title: sender.name,
        body: "Sent you a voice note 🎤",
        refMsgId: message.id,
      });
    }
  }

  return message;
};

export const markRead = async (conversationId, userId) => {
  await prisma.$transaction([
    prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, read: false },
      data: { read: true },
    }),
    prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: 0, lastReadAt: new Date() },
    }),
  ]);

  // Notify the other participant via WebSocket that messages were read
  getIO()
    .to(`conversation:${conversationId}`)
    .emit("message:read", { conversationId, readBy: userId });
};
