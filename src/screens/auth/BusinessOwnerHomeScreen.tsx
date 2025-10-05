import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import BackButton from "../../components/BackButton"; // ✅ BackButton import

// ✅ Updated param type matches RootStackParamList
type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "BusinessOwnerHomeScreen"
>;

const BusinessOwnerHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const handleCancel = () => {
    // Use goBack() to return to previous screen with tab bar intact
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("SearchResultsScreen");
    }
  };

  return (
    <View style={styles.container}>
      {/* Cancel Button - Top Right Corner */}
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Welcome Business Owner</Text>

      {/* New Business Owner */}
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate("SignUpFormBusinessOwners", { user_id: 0 })
        }
      >
        <Text style={styles.buttonText}>New Business Owner → Sign Up</Text>
      </TouchableOpacity>

      {/* Existing Business Owner */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("SigninBusinessOwners")}
      >
        <Text style={styles.buttonText}>Existing Business Owner → Login</Text>
      </TouchableOpacity>

      {/* 🔙 Added BackButton at bottom */}
      <BackButton style={{ marginTop: 30, backgroundColor: "green" }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 40 },
  button: { backgroundColor: "green", padding: 16, marginVertical: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 8,
  },
  cancelButtonText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default BusinessOwnerHomeScreen;
