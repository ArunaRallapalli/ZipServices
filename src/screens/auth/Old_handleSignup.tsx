
import React, { useState } from "react";
import { View, Button, Alert, StyleSheet } from "react-native";
import AppTextInput from "../../components/AppTextInput";

const SignUpForm = () => {
  // 👇 declare state variables
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    try {
      const response = await fetch("http://10.0.2.2:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,  // comes from useState
          email,           // comes from useState
          password,        // comes from useState
        }),
      });

      const data = await response.json();
      console.log("✅ Inserted user:", data);
      Alert.alert("Success", "User registered!");
    } catch (err) {
      console.error("Signup error:", err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  return (
    <View style={styles.container}>
      <AppTextInput placeholder="Full Name" value={name} onChangeText={setName} />
      <AppTextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <AppTextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Sign Up" onPress={handleSignUp} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});

export default SignUpForm;
