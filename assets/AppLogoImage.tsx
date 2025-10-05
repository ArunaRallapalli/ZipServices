import { View, Image, StyleSheet } from "react-native";
import React from "react";

const AppLogoImage = () => {
  return (
    <View>
      <Image
        source={{uri:"tps://images.pexels.com/photos/1115128/pexels-photo-1115128.jpeg"}}
        style={styles.image}
      />
    </View>
  );
};

export default AppLogoImage;

const styles = StyleSheet.create({
  image: {
    height: 33,
    width: 33,
  },
});
