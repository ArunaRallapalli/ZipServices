// CustomerHomeScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import BackButton from "../components/BackButton";
import { useAuth } from "../contexts/AuthContext";


type NavigationProp = NativeStackNavigationProp<RootStackParamList, "CustomerHomeScreen">;

const CustomerHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Customer</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("SignUpFormCustomers")}
      >
        <Text style={styles.buttonText}>New Customer Signup</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("SigninCustomer")}
      >
        <Text style={styles.buttonText}>Existing Customer Signin</Text>
      </TouchableOpacity>


{/* 🔙 Added BackButton at bottom */}
<BackButton
  style={{ 
    marginTop: 30,
    backgroundColor: '#007bff', // green background
  }}
/>


    </View>
     );
};

export default CustomerHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 40,
    color: "#007bff",
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
