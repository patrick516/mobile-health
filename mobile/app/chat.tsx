import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import {
  fetchMessages,
  sendMessage,
  markRead,
  Message,
  Conversation,
  fetchConversations,
} from "../src/services/conversationsService";
import {
  connectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
  emitTyping,
  emitStopTyping,
} from "../src/lib/socketClient";
import { useAuthStore } from "../src/store/authStore";
import { formatTime } from "../src/lib/utils";

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M19 12H5M12 5l-7 7 7 7"
        stroke="#1F0A3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
        stroke="#1F0A3C"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
function SendIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function TickIcon({ read }: { read: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M5 13l4 4L19 7"
        stroke={read ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user: me } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);

  // Load conversation info and messages
  useEffect(() => {
    if (!conversationId) return;

    Promise.all([fetchMessages(conversationId), fetchConversations()])
      .then(([msgs, convos]) => {
        setMessages(msgs.reverse());
        const convo = convos.find((c) => c.id === conversationId) ?? null;
        setConversation(convo);
        setPartnerOnline(convo?.participant?.online ?? false);
        markRead(conversationId).catch(console.error);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Socket setup
  useEffect(() => {
    if (!conversationId) return;
    connectSocket();
    const socket = getSocket();
    joinConversation(conversationId);

    socket.on("message:new", ({ conversationId: cId, message }) => {
      if (cId !== conversationId) return;
      setMessages((prev) => [...prev, message]);
      markRead(conversationId).catch(console.error);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socket.on("message:read", ({ conversationId: cId }) => {
      if (cId !== conversationId) return;
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
    });

    socket.on("typing:start", ({ conversationId: cId }) => {
      if (cId !== conversationId) return;
      setIsTyping(true);
    });

    socket.on("typing:stop", ({ conversationId: cId }) => {
      if (cId !== conversationId) return;
      setIsTyping(false);
    });

    socket.on("user:online", ({ userId }) => {
      if (userId === conversation?.participant?.id) setPartnerOnline(true);
    });

    socket.on("user:offline", ({ userId }) => {
      if (userId === conversation?.participant?.id) setPartnerOnline(false);
    });

    return () => {
      leaveConversation(conversationId);
      socket.off("message:new");
      socket.off("message:read");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("user:online");
      socket.off("user:offline");
    };
  }, [conversationId, conversation?.participant?.id]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (conversationId) {
      emitTyping(conversationId);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        emitStopTyping(conversationId);
      }, 1500);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !conversationId) return;
    const trimmed = text.trim();
    setText("");
    emitStopTyping(conversationId);

    // Optimistic UI
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: me?.id ?? "me",
      type: "text",
      text: trimmed,
      voiceUri: null,
      voiceDuration: null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const saved = await sendMessage(conversationId, trimmed);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? saved : m)),
      );
    } catch (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  };

  const partner = conversation?.participant;
  const photoUri = partner?.photoUrl ?? null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <BackIcon />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userInfo}
          onPress={() =>
            router.push({
              pathname: "/profile-detail",
              params: { userId: partner?.id },
            })
          }
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {partner?.name?.[0] ?? "?"}
                </Text>
              </View>
            )}
            {partnerOnline && <View style={styles.onlineDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{partner?.name ?? "Chat"}</Text>
            <Text
              style={[
                styles.headerStatus,
                {
                  color: isTyping
                    ? "#7C3AED"
                    : partnerOnline
                      ? "#22C55E"
                      : "#9CA3AF",
                },
              ]}
            >
              {isTyping ? "typing..." : partnerOnline ? "● Online" : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
          <MoreIcon />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>👋</Text>
              <Text style={styles.emptyChatText}>
                Say hello to {partner?.name ?? "your match"}!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.senderId === me?.id;
            return (
              <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                {!isMe && photoUri && (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.bubbleAvatar}
                  />
                )}
                {!isMe && !photoUri && (
                  <View style={[styles.bubbleAvatar, styles.avatarFallback]}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#7C3AED",
                        fontWeight: "700",
                      }}
                    >
                      {partner?.name?.[0] ?? "?"}
                    </Text>
                  </View>
                )}
                <View style={styles.bubbleWrap}>
                  {isMe ? (
                    <LinearGradient
                      colors={["#EE2090", "#7C3AED"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.bubble, styles.bubbleMe]}
                    >
                      <Text style={styles.bubbleTextMe}>{item.text}</Text>
                      <View style={styles.bubbleTimeRow}>
                        <Text style={styles.bubbleTimeMe}>
                          {formatTime(item.createdAt)}
                        </Text>
                        <TickIcon read={item.read} />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.bubble, styles.bubbleThem]}>
                      <Text style={styles.bubbleTextThem}>{item.text}</Text>
                      <Text style={styles.bubbleTimeThem}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />

        {/* Typing indicator */}
        {isTyping && (
          <View style={styles.typingWrap}>
            <Text style={styles.typingText}>
              {partner?.name ?? "They"} is typing...
            </Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity onPress={handleSend} activeOpacity={0.85}>
            <LinearGradient
              colors={["#EE2090", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              <SendIcon />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBF8",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative" },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0D0F0",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9D8FD",
  },
  avatarInitial: { fontSize: 16, fontWeight: "700", color: "#7C3AED" },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerName: { fontSize: 16, fontWeight: "700", color: "#1F0A3C" },
  headerStatus: { fontSize: 12, fontWeight: "500" },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: { padding: 16, paddingBottom: 8, gap: 12 },
  emptyChat: { alignItems: "center", paddingTop: 80 },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { fontSize: 15, color: "#9CA3AF", textAlign: "center" },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleRowMe: { flexDirection: "row-reverse" },
  bubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E0D0F0",
  },
  bubbleWrap: { maxWidth: "72%" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 6,
  },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleTextMe: { fontSize: 14, color: "#FFFFFF", lineHeight: 20 },
  bubbleTextThem: { fontSize: 14, color: "#1F0A3C", lineHeight: 20 },
  bubbleTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  bubbleTimeMe: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  bubbleTimeThem: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  typingWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  typingText: { fontSize: 12, color: "#7C3AED", fontStyle: "italic" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0EBF8",
  },
  input: {
    flex: 1,
    backgroundColor: "#F9F5FF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F0A3C",
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
