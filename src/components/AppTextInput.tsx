// AppTextInput.tsx
import React from "react";
import { TextInput, TextInputProps, StyleSheet } from "react-native";

interface AppTextInputProps extends TextInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

const AppTextInput: React.FC<AppTextInputProps> = (props) => {
  return <TextInput style={styles.input} {...props} />;
};

const styles = StyleSheet.create({
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 16,
  },
});

export default AppTextInput;
