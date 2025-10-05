import React from "react";
import { Image, StyleSheet } from "react-native";

const AppLogoImage = () => {
  return (
    <Image
      source={require("../assets/Makeup.png")}
      style={styles.logo}
      resizeMode="contain"
    />
  );
};

export default AppLogoImage;

const styles = StyleSheet.create({
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
});
