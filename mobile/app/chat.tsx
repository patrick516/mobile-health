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
} from "react-native";
import { useState, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { FAKE_USERS, FAKE_MESSAGES, ChatMessage } from "../src/data/fakeUsers";

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
function ImageIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="#9CA3AF"
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
function TickIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M5 13l4 4L19 7"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const user = FAKE_USERS.find((u) => u.id === userId) ?? FAKE_USERS[0];
  const [messages, setMessages] = useState<ChatMessage[]>(
    FAKE_MESSAGES[userId] ?? [],
  );
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!text.trim()) return;
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: "me",
      type: "text", // ← add this line
      text: text.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setText("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
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
              params: { userId: user.id },
            })
          }
          activeOpacity={0.8}
        >
          <Image source={{ uri: user.photo }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{user.name}</Text>
            <Text
              style={[
                styles.headerStatus,
                { color: user.online ? "#22C55E" : "#9CA3AF" },
              ]}
            >
              {user.online ? "● Online" : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
          <MoreIcon />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
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
          renderItem={({ item }) => {
            const isMe = item.senderId === "me";
            return (
              <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                {!isMe && (
                  <Image
                    source={{ uri: user.photo }}
                    style={styles.bubbleAvatar}
                  />
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
                        <Text style={styles.bubbleTimeMe}>{item.time}</Text>
                        <TickIcon />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.bubble, styles.bubbleThem]}>
                      <Text style={styles.bubbleTextThem}>{item.text}</Text>
                      <Text style={styles.bubbleTimeThem}>{item.time}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />

        {/* ── Input bar ── */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.8}>
            <ImageIcon />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            multiline
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity onPress={sendMessage} activeOpacity={0.85}>
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

  // Header
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
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0D0F0",
  },
  headerName: { fontSize: 16, fontWeight: "700", color: "#1F0A3C" },
  headerStatus: { fontSize: 12, fontWeight: "500" },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  // Messages
  messageList: { padding: 16, paddingBottom: 8, gap: 12 },
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

  // Input
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
  mediaBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
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
