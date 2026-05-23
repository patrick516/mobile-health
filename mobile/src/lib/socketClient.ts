import { io, Socket } from "socket.io-client";
import { getAuthToken } from "../store/authStore";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace("/api", "") ??
  "http://192.168.1.216:5000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      auth: { token: getAuthToken() },
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.auth = { token: getAuthToken() };
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinConversation(conversationId: string): void {
  getSocket().emit("conversation:join", conversationId);
}

export function leaveConversation(conversationId: string): void {
  getSocket().emit("conversation:leave", conversationId);
}

export function emitTyping(conversationId: string): void {
  getSocket().emit("typing:start", { conversationId });
}

export function emitStopTyping(conversationId: string): void {
  getSocket().emit("typing:stop", { conversationId });
}
