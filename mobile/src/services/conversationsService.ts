import apiClient from "../lib/apiClient";

export interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    photoUrl: string | null;
    online: boolean;
    verified: boolean;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "voice";
  text: string | null;
  voiceUri: string | null;
  voiceDuration: number | null;
  read: boolean;
  createdAt: string;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const response = await apiClient.get("/mobile/conversations");
  return response.data.conversations;
}

export async function fetchMessages(
  conversationId: string,
  page = 1,
): Promise<Message[]> {
  const response = await apiClient.get(
    `/mobile/conversations/${conversationId}/messages`,
    { params: { page, limit: 50 } },
  );
  return response.data.messages;
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<Message> {
  const response = await apiClient.post(
    `/mobile/conversations/${conversationId}/messages`,
    { text },
  );
  return response.data.message;
}

export async function markRead(conversationId: string): Promise<void> {
  await apiClient.patch(`/mobile/conversations/${conversationId}/read`);
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await apiClient.get("/mobile/conversations/unread-count");
  return response.data.unreadCount;
}
