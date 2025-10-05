import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";

interface BackButtonProps {
  style?: ViewStyle;
}

// ✅ Explicitly tell useNavigation about your stack
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const BackButton: React.FC<BackButtonProps> = ({ style }) => {
  const navigation = useNavigation<NavProp>();

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => navigation.navigate("SearchResultsScreen")}
    >
      <Text style={styles.text}>Back</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
  },
  text: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});

export default BackButton;
