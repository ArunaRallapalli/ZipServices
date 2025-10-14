import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  SafeAreaView,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import API_URL from "../config/apiConfig";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ChatScreen">;
type RouteProps = RouteProp<RootStackParamList, "ChatScreen">;

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message_text: string;
  created_at: string;
  is_read?: boolean;
}

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { currentUserId, otherUserId, otherUserName } = route.params || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const scrollRef = useRef<FlatList>(null);

  // Add validation for required parameters
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      console.error('Missing required parameters:', { currentUserId, otherUserId, otherUserName });
      Alert.alert(
        "Error", 
        "Missing required user information. Returning to previous screen.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      return;
    }
  }, [currentUserId, otherUserId, navigation]);

  // Early return if parameters are missing
  if (!currentUserId || !otherUserId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/${currentUserId}/${otherUserId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const validMessages = Array.isArray(data)
        ? data.filter((m) => m?.id && m?.sender_id && m?.receiver_id && m?.message_text)
        : [];
      const unreadMessages = validMessages.filter(
        (m) => m.sender_id === otherUserId && m.is_read === false
      );
      setHasUnreadMessages(unreadMessages.length > 0);
      setMessages(validMessages);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error("Error fetching messages:", err);
      Alert.alert("Error", "Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: currentUserId,
          receiver_id: otherUserId,
          message_text: inputText.trim(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const newMessage = await res.json();
      if (newMessage?.id && newMessage?.message_text) {
        setMessages((prev) => [...prev, newMessage]);
        setInputText("");
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  // Fixed back navigation - simply go back to previous screen
  const handleBackPress = () => {
    navigation.goBack();
  };

  const navigateToBusinessOwnerChatScreen = () => {
    navigation.goBack();
  };

  useEffect(() => {
    navigation.setOptions({
      title: otherUserName || "Chat",
      headerShown: false,
    });
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [currentUserId, otherUserId, otherUserName, navigation]);

  const keyExtractor = (item: Message, index: number) =>
    item?.id ? String(item.id) : `fallback-${index}`;

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender_id === currentUserId ? styles.sender : styles.receiver,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.sender_id === currentUserId && { color: "#fff" },
        ]}
      >
        {item.message_text}
      </Text>
      <Text
        style={[
          styles.timestamp,
          item.sender_id === currentUserId && { color: "#e0e7ff" },
        ]}
      >
        {item.created_at
          ? new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "No time"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            hasUnreadMessages && styles.headerTitleBold,
          ]}
        >
          {otherUserName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        ref={scrollRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.messageContainer}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={loading || !inputText.trim()}
          >
            <Text style={styles.sendButtonText}>{loading ? "..." : "Send"}</Text>
          </TouchableOpacity>
        </View>

        

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    minHeight: 56,
  },
  headerBackButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
    minWidth: 60,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    flex: 1,
  },
  headerTitleBold: {
    fontWeight: "800",
    color: "#4f46e5",
  },
  headerSpacer: {
    width: 76,
  },
  messageContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: "80%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  // Customer (currentUser) messages
  sender: {
    backgroundColor: "#3B82F6", // blue
    alignSelf: "flex-end",
    marginLeft: "20%",
  },
  // Business owner (other user) messages
  receiver: {
    backgroundColor: "#10B981", // green
    alignSelf: "flex-start",
    marginRight: "20%",
  },
  messageText: { fontSize: 16, color: "#fff" }, // white text for both
  timestamp: { fontSize: 12, color: "#e0e7ff", marginTop: 4, textAlign: "right" },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "green",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});