/**
 * ServiceDetailScreen.tsx
 *
 * @created March 2026
 *
 * Full-screen detail view opened when user taps a mini card in SearchResultsList.
 * Reuses the existing ServiceCard component — no duplicated UI logic.
 *
 * Flow:
 *   SearchResultsList (mini grid)
 *     → tap card
 *       → ServiceDetailScreen (this file)
 *           → renders ServiceCard (photos, zoom, stars, reviews, contact)
 *             → tap "Contact Provider"
 *               → chat screen
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import ServiceCard from "../components/ServiceCard";   // ← reuse existing component

type ServiceDetailRouteProp = RouteProp<RootStackParamList, "ServiceDetail">;
type ServiceDetailNavProp   = StackNavigationProp<RootStackParamList, "ServiceDetail">;

const ServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<ServiceDetailNavProp>();
  const route      = useRoute<ServiceDetailRouteProp>();

  const { item, onChatPress } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Service Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* ── ServiceCard inside a scroll view ── */}
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <ServiceCard
          item={item}
          isOwnPost={false}          // detail screen is always viewer perspective
          onChatPress={(item) => {
            navigation.goBack();
            // Small delay so the screen pops before chat opens
            setTimeout(() => onChatPress(item), 300);
          }}
        />
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingTop: 50,
  },

  backBtn: {
    padding: 6,
  },

  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },

  headerPlaceholder: {
    width: 36,   // balances the back button width
  },

  body: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default ServiceDetailScreen;