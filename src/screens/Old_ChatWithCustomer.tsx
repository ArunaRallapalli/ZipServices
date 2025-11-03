import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

type RootStackParamList = {
  ChatWithCustomer: { customerId: number; customerName: string };
};

type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  message_text: string;
  created_at: string;
};

const API_BASE_URL = "http://10.0.2.2:5000"; // for Android emulator

const ChatWithCustomer: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, "ChatWithCustomer">>();
  const { customerId, customerName } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/messages/${customerId}`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data: Message[] = await response.json();
        setMessages(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [customerId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: customerId,
          message_text: newMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const sentMessage: Message = await response.json();
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.header}>Chat with {customerName}</Text>
      <FlatList
        style={styles.messagesList}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.sender_id === customerId ? styles.incoming : styles.outgoing,
            ]}
          >
            <Text style={styles.messageText}>{item.message_text}</Text>
            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleTimeString()}</Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={sending}>
          <Text style={styles.sendButtonText}>{sending ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  messagesList: { flex: 1 },
  messageBubble: { marginVertical: 4, padding: 10, borderRadius: 8, maxWidth: "80%" },
  incoming: { backgroundColor: "#eee", alignSelf: "flex-start" },
  outgoing: { backgroundColor: "#4caf50", alignSelf: "flex-end" },
  messageText: { color: "#000" },
  timestamp: { fontSize: 10, color: "#555", marginTop: 2, alignSelf: "flex-end" },
  inputContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  sendButton: { marginLeft: 8, backgroundColor: "#4caf50", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  sendButtonText: { color: "#fff", fontWeight: "bold" },
});

export default ChatWithCustomer;
