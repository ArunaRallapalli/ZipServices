import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView,Image,Platform,ScrollView,} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLogoImage from '../components/texts/AppLogoImage';
import DropdownSelectionWithLogic from '../screens/Old_DropdownSelectionWithLogic'
const HomeScreen = () => {
  return (

             //const ButtonPress = () => Alert.alert("view Button Pressed")
  

    <SafeAreaView style={styles.container}>
     
    <Text> this {Platform.OS==="android"?" is Android" :"is IOS"} Device</Text>

      <ScrollView>
  
      <AppLogoImage/>
      <Text style={styles.Brandname}>What brand do you typically wear?</Text>

      <Text style={styles.ProductSelection} > Select details for a product you currently use.</Text>

      <Text>We'll provide the closest match in</Text>

      <Text style={styles.MakeBold}> undefined</Text>

                  
      //<StatusBar style="auto" />
   
              </ScrollView> 
              
    </SafeAreaView>
    
  );
}
 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '',
    alignItems: 'center',
    justifyContent: 'center',
  },
  Brandname: {
    textAlign: "center",
    fontSize: 21,
    fontWeight: "bold"

  },
  ProductSelection: {
    textAlign: "justify",
    fontSize: 15
  },
  MakeBold: {

    fontWeight: "bold"

  }

}
);




    
