// src/config/socket.js

import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import prisma from "./db.js";

let io;

// Map of userId → socketId for tracking online users
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  // Authenticate socket connection using JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return next(new Error("Unauthorized"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    console.log(`[SOCKET] User connected: ${userId}`);

    // Track online status
    onlineUsers.set(userId, socket.id);
    await prisma.user.update({ where: { id: userId }, data: { online: true } });

    // Broadcast to others that this user is online
    socket.broadcast.emit("user:online", { userId });

    // Join a conversation room
    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`[SOCKET] ${userId} joined conversation:${conversationId}`);
    });

    // Leave a conversation room
    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Typing indicator
    socket.on("typing:start", ({ conversationId }) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit("typing:start", { userId });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit("typing:stop", { userId });
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`[SOCKET] User disconnected: ${userId}`);
      onlineUsers.delete(userId);
      await prisma.user.update({
        where: { id: userId },
        data: { online: false, lastSeenAt: new Date() },
      });
      socket.broadcast.emit("user:offline", { userId });
    });
  });

  return io;
};

// Get the io instance anywhere in the app
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

// Check if a user is currently connected
export const isUserOnline = (userId) => onlineUsers.has(userId);
