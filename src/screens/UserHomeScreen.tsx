import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import BackButton from "../components/BackButton";

type RootStackParamList = {
  UserHome: undefined;
  UnifiedUserSignupScreen: undefined;
  UnifiedUserLoginScreen: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "UserHome">;

const UserHomeScreen: React.FC<Props> = ({ navigation }) => {
  const nav = useNavigation();

  return (
    <View style={styles.container}>
      {/* ✅ Top-right Cancel */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => nav.goBack()}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>
        Please sign up for a new account or log in to continue.
      </Text>

      <TouchableOpacity
        style={[styles.button, styles.signup]}
        onPress={() => navigation.navigate("UnifiedUserSignupScreen")}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.login]}
        onPress={() => navigation.navigate("UnifiedUserLoginScreen")}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

     </View>
  );
};

export default UserHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  cancelButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: "#007bff",
    fontWeight: "500",
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    width: "70%",
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: "center",
  },
  signup: { backgroundColor: "#007bff" },
  login: { backgroundColor: "#28a745" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
