/**
 * Last Updated: January 9, 2026
 * Changes: 
 * - Calendar button shows AvailabilityCalendarWidget as small right-side overlay
 * - Widget appears as 360px wide popup, doesn't cover full screen
 * - Tap backdrop to close widget
 * 
 * ChatScreen Component
 *
 * Displays a conversation between two users.
 * Uses api client for authenticated requests.
 * Includes calendar widget for booking appointments with the other user.
 * 
 */

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  StyleSheet, 
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/MainStackNavigator";
import api from "../api";
import { Alert } from "../Utils/Alert";
import { BackButton } from "../components/BackButton";
import AvailabilityCalendarWidget from "../components/AvailabilityCalendarWidget";
import { createResponsiveStyles } from "../Utils/globalStyles";

/* ───────────────────────── Types ───────────────────────── */

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ChatScreen"
>;
type RouteProps = RouteProp<RootStackParamList, "ChatScreen">;

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message_text: string;
  created_at: string;
  is_read?: boolean;
}

/* ───────────────────── Component ───────────────────── */

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { currentUserId, otherUserId, otherUserName } = route.params || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const scrollRef = useRef<FlatList<Message>>(null);

  /* ───────────────── Validation ───────────────── */

  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      Alert.alert(
        "Error",
        "Missing required user information.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }
  }, [currentUserId, otherUserId, navigation]);

  if (!currentUserId || !otherUserId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 40 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  /* ───────────────── API Calls ───────────────── */

  const markMessagesAsRead = async (messageIds: number[]) => {
    try {
      await api.put("/messages/mark-read", {
        message_ids: messageIds,
        user_id: currentUserId,
      });
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  const fetchMessages = async () => {
    try {
      const data: Message[] = await api.get(
        `/messages/${currentUserId}/${otherUserId}`
      );

      const validMessages = Array.isArray(data) ? data : [];

      const unreadMessages = validMessages.filter(
        (m) => m.sender_id === otherUserId && m.is_read === false
      );

      setHasUnreadMessages(unreadMessages.length > 0);
      setMessages(validMessages);

      if (unreadMessages.length > 0) {
        await markMessagesAsRead(unreadMessages.map((m) => m.id));
      }

      setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: true }),
        100
      );
    } catch (err) {
      console.error("Error fetching messages:", err);
      Alert.alert("Error", "Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const newMessage: Message = await api.post("/messages", {
        sender_id: currentUserId,
        receiver_id: otherUserId,
        message_text: inputText.trim(),
      });

      setMessages((prev) => [...prev, newMessage]);
      setInputText("");

      setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: true }),
        100
      );
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────── Effects ───────────────── */

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    fetchMessages();

    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [currentUserId, otherUserId]);

  /* ───────────────── Render Helpers ───────────────── */

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender_id === currentUserId
          ? styles.sender
          : styles.receiver,
      ]}
    >
      <Text style={styles.messageText}>{item.message_text}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );

  /* ───────────────── UI ───────────────── */

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text
          style={[
            styles.headerTitle,
            hasUnreadMessages && styles.headerTitleBold,
          ]}
        >
          {otherUserName}
        </Text>

        {/* Calendar button - Shows small widget overlay on right side */}
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons name="calendar-outline" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Calendar Widget - Small right-side overlay */}
      {showCalendar && (
        <>
          {/* Semi-transparent backdrop - tap to close */}
          <TouchableOpacity
            style={styles.calendarBackdrop}
            activeOpacity={1}
            onPress={() => setShowCalendar(false)}
          />
          
          {/* Calendar Widget - Right Side Panel */}
          <View style={styles.calendarOverlay}>
            <AvailabilityCalendarWidget
              otherUserId={otherUserId}
              onClose={() => setShowCalendar(false)}
            />
          </View>
        </>
      )}

      {/* Messages */}
      <FlatList
        ref={scrollRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.messageContainer}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              loading && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={loading}
          >
            <Text style={styles.sendButtonText}>
              {loading ? "..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ───────────────── Styles ───────────────── */

const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },

  headerTitleBold: {
    color: "#4f46e5",
    fontWeight: "800",
  },

  calendarButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
  },

  // Semi-transparent backdrop - covers screen, tap to close
  calendarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },

  // Right-side small overlay panel for calendar widget
  calendarOverlay: {
    position: 'absolute',
    top: 70,           // Below header
    right: 10,         // 10px from right edge
    width: 360,        // Fixed small width (doesn't cover full screen)
    maxHeight: '70%',  // Max 70% of screen height
    backgroundColor: '#fff',
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },

  messageContainer: {
    padding: 16,
  },

  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: "80%",
  },

  sender: {
    backgroundColor: "#3B82F6",
    alignSelf: "flex-end",
  },

  receiver: {
    backgroundColor: "#10B981",
    alignSelf: "flex-start",
  },

  messageText: {
    color: "#fff",
    fontSize: 16,
  },

  timestamp: {
    fontSize: 12,
    color: "#e5e7eb",
    marginTop: 4,
    textAlign: "right",
  },

  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    padding: 12,
    marginRight: 8,
  },

  sendButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: "center",
  },

  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },

  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});