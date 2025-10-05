import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { useRoute, RouteProp, useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import API_URL from "../config/apiConfig";

type CustomerChatScreenRouteProp = RouteProp<RootStackParamList, "CustomerChatScreen">;

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
  sender_name?: string;
}

const CustomerChatScreen: React.FC = () => {
  const route = useRoute<CustomerChatScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { businessOwnerId, businessName, customerId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const url = `${API_URL}/messages/${customerId}/${businessOwnerId}`;
        console.log("FETCH URL:", url);

        const res = await fetch(url);
        console.log("STATUS:", res.status);
        const text = await res.text();
        console.log("RAW RESPONSE (first 200 chars):", text.slice(0, 200));

        if (!res.ok) {
          console.error(`HTTP ${res.status}: ${text}`);
          throw new Error(`HTTP ${res.status}`);
        }

        const data = JSON.parse(text);
        console.log("Parsed data:", data);

        if (Array.isArray(data)) {
          setMessages(data);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          console.error("Unexpected data format:", data);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [customerId, businessOwnerId]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    const messagePayload = {
      sender_id: customerId.toString(),
      receiver_id: businessOwnerId.toString(),
      message_text: newMessage.trim(),
    };

    console.log("Sending message:", messagePayload);

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messagePayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Send message error: ${res.status} - ${errorText}`);
        throw new Error(`HTTP ${res.status}`);
      }

      const savedMessage = await res.json();
      console.log("Message sent successfully:", savedMessage);

      setMessages((prev) => [...prev, savedMessage]);
      setNewMessage("");

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Failed to send message");
    }
  }, [newMessage, customerId, businessOwnerId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.chatContainer}>
        <Text style={styles.sectionTitle}>Chat with {businessName}</Text>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.sender_id === customerId.toString()
                  ? styles.sentMessage
                  : styles.receivedMessage,
              ]}
            >
              {item.sender_name && item.sender_id !== customerId.toString() && (
                <Text style={styles.senderName}>{item.sender_name}</Text>
              )}
              <Text style={styles.messageText}>{item.message_text}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.created_at).toLocaleTimeString()}
              </Text>
            </View>
          )}
          onContentSizeChange={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          onLayout={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          style={styles.messagesList}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: 'blue' }]}
          onPress={() => navigation.navigate("CustomerConversationsScreen", { customerId })}
        >
          <Text style={[styles.backButtonText, { color: 'white' }]}>Back to Conversations</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CustomerChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  chatContainer: { flex: 1, padding: 10 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 10, 
    textAlign: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd"
  },
  messagesList: { flex: 1, marginBottom: 10 },
  messageBubble: { padding: 10, marginVertical: 4, borderRadius: 8, maxWidth: "70%" },
  sentMessage: { backgroundColor: "#a8e6cf", alignSelf: "flex-end" },
  receivedMessage: { backgroundColor: "#add8e6", alignSelf: "flex-start" },
  senderName: { fontSize: 12, fontWeight: "bold", color: "#333" },
  messageText: { fontSize: 16, color: "#000" },
  timestamp: { fontSize: 10, color: "#666", marginTop: 4 },
  inputContainer: { flexDirection: "row", marginBottom: 10, borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 8, maxHeight: 100 },
  sendButton: { marginLeft: 10, backgroundColor: "#007bff", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 5, justifyContent: "center" },
  sendButtonText: { color: "#fff", fontWeight: "bold" },
  backButton: { backgroundColor: "#888", paddingVertical: 10, borderRadius: 5, alignItems: "center" },
  backButtonText: { color: "#fff", fontWeight: "bold" },
});
