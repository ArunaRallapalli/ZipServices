import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, AntDesign } from '@expo/vector-icons';

interface SignInPlaceholderScreenProps {
  screenName: string;
  iconName: string;
  iconFamily: 'Ionicons' | 'MaterialIcons' | 'AntDesign';
}

const SignInPlaceholderScreen: React.FC<SignInPlaceholderScreenProps> = ({ screenName, iconName, iconFamily }) => {
  const navigation = useNavigation();

  const handleSignIn = () => {
    const tabNavigator = navigation.getParent();
    const rootStack = tabNavigator?.getParent();
    
    // Navigate to BusinessOwnerHomeScreen instead of ZipserviceHomeScreenSelection
    if (rootStack) {
      (rootStack as any).navigate('BusinessOwnerHomeScreen');
    } else if (tabNavigator) {
      (tabNavigator as any).navigate('BusinessOwnerHomeScreen');
    } else {
      (navigation as any).navigate('BusinessOwnerHomeScreen');
    }
  };

  const handleBrowseServices = () => {
    // Navigate within the tab navigator to Home tab
    (navigation as any).navigate('Home', {
      customerInfo: undefined,
      isGuest: false,
      preselectedCategory: ""
    });
  };

  // Render the appropriate icon
  const renderIcon = () => {
    const size = 80;
    const color = '#ccc';
    
    switch (iconFamily) {
      case 'Ionicons':
        return <Ionicons name={iconName as any} size={size} color={color} />;
      case 'MaterialIcons':
        return <MaterialIcons name={iconName as any} size={size} color={color} />;
      case 'AntDesign':
        return <AntDesign name={iconName as any} size={size} color={color} />;
      default:
        return <Ionicons name="lock-closed-outline" size={size} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderIcon()}
      
      <Text style={styles.title}>Sign In Required</Text>
      
      <Text style={styles.subtitle}>
        You need to be signed in to access {screenName.toLowerCase()}
      </Text>

      <TouchableOpacity
        style={styles.signInButton}
        onPress={handleSignIn}
        activeOpacity={0.7}
      >
        <Ionicons name="log-in-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
        <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.browseButton}
        onPress={handleBrowseServices}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={20} color="#4A90E2" style={styles.buttonIcon} />
        <Text style={styles.browseButtonText}>Browse Services</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        You can browse services without signing in
      </Text>
    </View>
  );
};

// Create specific components for Messages, Profile, and Post
export const MessagesPlaceholder: React.FC = () => (
  <SignInPlaceholderScreen 
    screenName="Messages" 
    iconName="chatbubbles-outline" 
    iconFamily="Ionicons" 
  />
);

export const ProfilePlaceholder: React.FC = () => (
  <SignInPlaceholderScreen 
    screenName="Profile" 
    iconName="person-outline" 
    iconFamily="MaterialIcons" 
  />
);

export const PostPlaceholder: React.FC = () => (
  <SignInPlaceholderScreen 
    screenName="Post Services" 
    iconName="pluscircleo" 
    iconFamily="AntDesign" 
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 15,
    width: '85%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  browseButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '85%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A90E2',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  browseButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default SignInPlaceholderScreen;