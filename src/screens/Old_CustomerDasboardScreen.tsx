import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  SafeAreaView,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";

const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";

type CustomerDashboardRouteProp = RouteProp<
  RootStackParamList,
  "CustomerDashboard"
>;
type CustomerDashboardNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "CustomerDashboard"
>;

const CustomerDashboardScreen: React.FC = () => {
  const route = useRoute<CustomerDashboardRouteProp>();
  const navigation = useNavigation<CustomerDashboardNavProp>();
  const customerInfo = route.params?.customerInfo;

  const navigateToCustomerProfile = () => {
    if (customerInfo?.user_id) {
      navigation.navigate("CustomerProfileScreen", {
        customer_id: customerInfo.user_id,
      });
    } else {
      Alert.alert("Error", "Customer information not found");
    }
  };

  const navigateToSearch = () => {
    navigation.navigate("SearchResultsScreen", {
      customerInfo: customerInfo,
    });
  };

  const navigateToConversations = () => {
    if (customerInfo?.user_id) {
      navigation.navigate("CustomerConversationsScreen", {
        customerId: customerInfo.user_id,
      });
    } else {
      Alert.alert("Error", "Customer information not found");
    }
  };

  if (!customerInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Customer information not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("CustomerHomeScreen")}
        >
          <Text style={styles.backButtonText}>Back to Customer Home Screen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top-right small profile button */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={navigateToCustomerProfile}
        >
          <Text style={styles.profileButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Welcome, {customerInfo.full_name}!</Text>
        <Text style={styles.subtitle}>What would you like to do?</Text>

        <View style={styles.buttonContainer}>
          {/* Search for Services Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={navigateToSearch}>
            <Text style={styles.buttonIcon}>🔍</Text>
            <Text style={styles.primaryButtonText}>Search for Services</Text>
            <Text style={styles.buttonDescription}>
              Find and connect with local business owners
            </Text>
          </TouchableOpacity>

          {/* My Conversations Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={navigateToConversations}
          >
            <Text style={styles.buttonIcon}>💬</Text>
            <Text style={styles.secondaryButtonText}>My Conversations</Text>
            <Text style={styles.buttonDescription}>
              Continue chatting with business owners
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("CustomerHomeScreen")}
        >
          <Text style={styles.backButtonText}>← Back to Customer Home Screen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  profileButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 30,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: "#10b981",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  buttonDescription: {
    color: "#ffffff",
    fontSize: 14,
    opacity: 0.9,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 20,
  },
});

export default CustomerDashboardScreen;
