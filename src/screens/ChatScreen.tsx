/**
 * ChatScreen Component
 * 
 * This is the main chat/messaging screen that displays a conversation between two users.
 * It shows the message history, allows sending new messages, and marks messages as read.
 * 
 * Features:
 * - Real-time message fetching (polls every 5 seconds)
 * - Send text messages up to 500 characters
 * - Auto-scroll to latest message
 * - Mark incoming messages as read automatically
 * - Custom header with back navigation
 * - Different colored message bubbles for sender vs receiver
 * - Loading states and error handling
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
  SafeAreaView,
  StyleSheet,
  } from "react-native";
  import { createResponsiveStyles } from '../Utils/globalStyles';
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import API_URL from "../config/apiConfig";
import { Alert } from "../Utils/Alert";
import { BackButton } from '../components/BackButton';

// Navigation type definitions for type safety
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ChatScreen">;
type RouteProps = RouteProp<RootStackParamList, "ChatScreen">;

// Message interface defines the structure of each chat message
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
  
  // Extract route parameters: current user ID, other user ID, and other user's name
  const { currentUserId, otherUserId, otherUserName } = route.params || {};

  // State: Array of all messages in the conversation
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State: Current text being typed in the input field
  const [inputText, setInputText] = useState("");
  
  // State: Loading indicator for send button
  const [loading, setLoading] = useState(false);
  
  // State: Flag to indicate if there are unread messages (affects header styling)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Ref to FlatList for programmatic scrolling to bottom
  const scrollRef = useRef<FlatList>(null);

  // Validation: Check if required parameters are present, show alert and go back if missing
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

  // Early return: Show loading screen if parameters are missing
  if (!currentUserId || !otherUserId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Fetch all messages between current user and other user
   * Also identifies unread messages and marks them as read automatically
   */
  const fetchMessages = async () => {
    try {
      // API call to get messages between the two users
      const res = await fetch(`${API_URL}/messages/${currentUserId}/${otherUserId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Filter out invalid messages (must have id, sender_id, receiver_id, and message_text)
      const validMessages = Array.isArray(data)
        ? data.filter((m) => m?.id && m?.sender_id && m?.receiver_id && m?.message_text)
        : [];
      
      // Find unread messages from the other user
      const unreadMessages = validMessages.filter(
        (m) => m.sender_id === otherUserId && m.is_read === false
      );
      
      // Update state: set flag if there are unread messages
      setHasUnreadMessages(unreadMessages.length > 0);
      
      // Update state: set the messages array
      setMessages(validMessages);
      
      // Mark messages as read if there are any unread messages
      if (unreadMessages.length > 0) {
        await markMessagesAsRead(unreadMessages.map(m => m.id));
      }
      
      // Auto-scroll to bottom after a short delay to show latest message
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error("Error fetching messages:", err);
      Alert.alert("Error", "Failed to load messages");
    }
  };

  /**
   * Send a new message to the other user
   */
  const sendMessage = async () => {
    // Don't send if input is empty or only whitespace
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      // API call to create a new message
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
      
      // If server returns a valid message, add it to state optimistically
      if (newMessage?.id && newMessage?.message_text) {
        setMessages((prev) => [...prev, newMessage]);
        setInputText(""); // Clear input field
        
        // Auto-scroll to show the new message
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        // Fallback: re-fetch all messages if response is unexpected
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark specific messages as read by their IDs
   * Called automatically when unread messages are detected in fetchMessages
   */
  const markMessagesAsRead = async (messageIds: number[]) => {
    try {
      console.log('[ChatScreen] Marking messages as read:', messageIds);
      await fetch(`${API_URL}/messages/mark-read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_ids: messageIds,
          user_id: currentUserId
        }),
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  /**
   * Handle back button press - navigate to previous screen
   */
  const handleBackPress = () => {
    navigation.goBack();
  };

  /**
   * Alternative navigation function (currently unused but defined)
   */
  const navigateToBusinessOwnerChatScreen = () => {
    navigation.goBack();
  };

  /**
   * Main effect: Set up screen title and start message polling
   * - Sets custom header title to other user's name
   * - Fetches messages immediately on mount
   * - Sets up interval to poll for new messages every 5 seconds
   * - Cleans up interval on unmount
   */
  useEffect(() => {
    navigation.setOptions({
      headerTitle: otherUserName || "Chat",
      headerShown: false, // Using custom header instead
    });
    
    fetchMessages(); // Initial fetch
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    
    // Cleanup: clear interval when component unmounts
    return () => clearInterval(interval);
  }, [currentUserId, otherUserId, otherUserName, navigation]);

  /**
   * Generate unique key for each message in FlatList
   * Uses message ID if available, falls back to index
   */
  const keyExtractor = (item: Message, index: number) =>
    item?.id ? String(item.id) : `fallback-${index}`;

  /**
   * Render a single message bubble
   * Styling differs based on whether message is from current user or other user
   */
  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        // Current user's messages on right (blue), other user's on left (green)
        item.sender_id === currentUserId ? styles.sender : styles.receiver,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          // White text for current user's messages
          item.sender_id === currentUserId && { color: "#fff" },
        ]}
      >
        {item.message_text}
      </Text>
      <Text
        style={[
          styles.timestamp,
          // Lighter colored timestamp for current user's messages
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
      {/* Custom Header: Back button, user name, and spacer for centering */}
      <View style={styles.header}>
       <BackButton 
  iconColor="#4A90E2"
  textColor="#4A90E2"
  backgroundColor="transparent"
/>
        {/* User name - bold and colored if there are unread messages */}
        <Text
          style={[
            styles.headerTitle,
            hasUnreadMessages && styles.headerTitleBold,
          ]}
        >
          {otherUserName}
        </Text>
        
        {/* Spacer to center the title */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Message List: Scrollable list of all messages */}
      <FlatList
        ref={scrollRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.messageContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Area: Text input and send button, keyboard-aware */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inputContainer}>
          {/* Text input field with 500 character limit */}
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          
          {/* Send button - disabled when loading or input is empty */}
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

// Styles: All styling for the component
const styles = createResponsiveStyles({
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
      fontSize: 16,
      
    fontWeight: '600',
     color: "#4A90E2",
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
    width: 76, // Matches back button width to center title
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
  // Customer (currentUser) messages - blue bubbles on right side
  sender: {
    backgroundColor: "#3B82F6", // blue
    alignSelf: "flex-end",
    marginLeft: "20%",
  },
  // Business owner (other user) messages - green bubbles on left side
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