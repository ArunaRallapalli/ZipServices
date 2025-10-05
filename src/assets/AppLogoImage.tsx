import { View, Image, StyleSheet } from "react-native";
import React from "react";

const AppLogoImage = () => {
  return (
    <View>
      <Image
        source={{uri:"https://images.pexels.com/photos/1115128/pexels-photo-1115128.jpeg"}}
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
/*import React from "react";
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
*/
