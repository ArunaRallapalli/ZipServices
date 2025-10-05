import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
const API_URL = "http://192.168.1.100:5000"; // Replace with your backend IP
//const API_URL = "http://192.168.1.100:5000"; // Replace with your backend IP

interface ChatProps {
  currentUserId: string | number;
  otherUserId: string | number;
}

interface Message {
  id: string | number;
  sender_id: string | number;
  receiver_id: string | number;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

const Chat = ({ currentUserId, otherUserId }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [currentUserId, otherUserId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/${currentUserId}/${otherUserId}`);
      const data: Message[] = await res.json();
      setMessages(data || []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  };

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Optimistic message
    const tempMsg: Message = {
      id: Date.now(),
      sender_id: currentUserId,
      receiver_id: otherUserId,
      message_text: trimmed,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: currentUserId,
          receiver_id: otherUserId,
          message_text: trimmed,
        }),
      });
      const savedMsg: Message = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? savedMsg : m))
      );
    } catch (err) {
      console.error("Send message error:", err);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setInputText(trimmed);
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.scrollContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View key={msg.id} style={[styles.messageBubble, msg.sender_id.toString() === currentUserId.toString() ? styles.myMsg : styles.otherMsg]}>
              <Text style={msg.sender_id.toString() === currentUserId.toString() ? styles.myMsgText : styles.otherMsgText}>
                {msg.message_text}
              </Text>
              <Text style={styles.timestamp}>{formatTime(msg.created_at)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          style={styles.input}
          multiline
        />
        <TouchableOpacity onPress={sendMessage} disabled={!inputText.trim()} style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}>
          <Text style={[styles.sendText, !inputText.trim() && styles.sendTextDisabled]}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { padding: 15, paddingBottom: 20 },
  messageBubble: { padding: 12, borderRadius: 16, marginVertical: 3, maxWidth: "80%" },
  myMsg: { alignSelf: "flex-end", backgroundColor: "#4f93e6" },
  otherMsg: { alignSelf: "flex-start", backgroundColor: "#fff" },
  myMsgText: { color: "#fff" },
  otherMsgText: { color: "#333" },
  timestamp: { fontSize: 11, color: "#666", marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 50 },
  emptyText: { color: "#666", fontSize: 16, textAlign: "center" },
  inputRow: { flexDirection: "row", padding: 15, borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: "#fff", fontSize: 16, maxHeight: 100 },
  sendBtn: { marginLeft: 10, backgroundColor: "#4f93e6", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#ccc" },
  sendText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  sendTextDisabled: { color: "#999" },
});

export default Chat;
