import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchHeaderProps {
  isAuthenticated: boolean;
  customerName?: string;
  onSignInPress: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  isAuthenticated,
  customerName,
  onSignInPress,
}) => {
  return (
    <View style={styles.headerSection}>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.mainTitle}>Find Services Near You</Text>
        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.signInIcon}
            onPress={onSignInPress}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={28} color="#FF0000" />
            <Text style={styles.signInIconText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        Connect with trusted service providers in your area
      </Text>

      {isAuthenticated && customerName && (
        <View style={styles.welcomeContainer}>
          <Ionicons name="person-circle" size={20} color="#ffffff" />
          <Text style={styles.welcomeText}>Welcome, {customerName}!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    backgroundColor: "#4A90E2",
    paddingVertical: 30,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.9,
    marginBottom: 15,
  },
  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 10,
  },
  welcomeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  signInIcon: {
    position: "absolute",
    right: 0,
    padding: 5,
    alignItems: "center",
  },
  signInIconText: {
    color: "#FF0000",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default SearchHeader;