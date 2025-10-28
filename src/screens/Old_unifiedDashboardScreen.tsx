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
import TopTabs from "../components/TopTabs"; // Import your TopTabs component

type CustomerDashboardRouteProp = RouteProp<
  RootStackParamList,
  "CustomerDashboard"
>;
type CustomerDashboardNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "CustomerDashboard"
>;

const UnifiedDashboardScreen: React.FC = () => {
  const route = useRoute<CustomerDashboardRouteProp>();
  const navigation = useNavigation<CustomerDashboardNavProp>();
  const userInfo = route.params?.customerInfo; // Can be customer or business owner info

  const [showTabs, setShowTabs] = useState(false);

  const navigateToProfile = () => {
    if (userInfo?.user_id) {
      // Navigate to appropriate profile screen based on user type
      if (userInfo.business_name) {
        // This is likely a business owner
        navigation.navigate("BusinessOwnerProfileScreen" as never, {
          business_owner_id: userInfo.user_id,
        } as never);
      } else {
        // This is likely a customer
        navigation.navigate("CustomerProfileScreen", {
          customer_id: userInfo.user_id,
        });
      }
    } else {
      Alert.alert("Error", "User information not found");
    }
  };

  const handleStartUsingApp = () => {
    setShowTabs(true);
  };

  const handleBackToWelcome = () => {
    setShowTabs(false);
  };

  if (!userInfo) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <Text style={styles.errorText}>User information not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("CustomerHomeScreen")}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If showTabs is true, render the TopTabs component
  if (showTabs) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        {/* Header with Back and Profile buttons */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backToWelcomeButton}
            onPress={handleBackToWelcome}
          >
            <Text style={styles.backToWelcomeText}>← Welcome</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={navigateToProfile}
          >
            <Text style={styles.profileButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* TopTabs Component */}
        <TopTabs userInfo={userInfo} />
      </SafeAreaView>
    );
  }

  // Welcome screen
  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top-right small profile button */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.profileButton}
          onPress={navigateToProfile}
        >
          <Text style={styles.profileButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>
          Welcome, {userInfo.full_name || userInfo.business_name}!
        </Text>
        <Text style={styles.subtitle}>
          {userInfo.business_name 
            ? "Manage your business and connect with customers" 
            : "Find services and connect with business owners"}
        </Text>

        <View style={styles.buttonContainer}>
          {/* Main Action Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartUsingApp}>
            <Text style={styles.buttonIcon}>🚀</Text>
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Text style={styles.buttonDescription}>
              Search for services and manage your messages
            </Text>
          </TouchableOpacity>

          {/* Feature Overview */}
          <View style={styles.featureContainer}>
            <Text style={styles.featureTitle}>What you can do:</Text>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔍</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureItemTitle}>Search Services</Text>
                <Text style={styles.featureItemDesc}>Find local business owners and services</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💬</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureItemTitle}>Message & Chat</Text>
                <Text style={styles.featureItemDesc}>Communicate directly with other users</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>⭐</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureItemTitle}>Manage Profile</Text>
                <Text style={styles.featureItemDesc}>Update your information and preferences</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("CustomerHomeScreen")}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backToWelcomeButton: {
    backgroundColor: "#6b7280",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  backToWelcomeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
    marginBottom: 30,
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  buttonDescription: {
    color: "#ffffff",
    fontSize: 14,
    opacity: 0.9,
    textAlign: "center",
  },
  featureContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
  },
  featureText: {
    flex: 1,
  },
  featureItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  featureItemDesc: {
    fontSize: 14,
    color: "#6b7280",
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