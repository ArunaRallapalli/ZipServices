/**
 * SignInPlaceholderScreen Component
 * 
 * A reusable placeholder screen displayed when users attempt to access features
 * that require authentication (e.g., Messages, Profile, Post Services).
 * 
 * PURPOSE:
 * - Blocks unauthenticated access to protected features
 * - Provides clear call-to-action for sign-in/sign-up
 * - Offers alternative action (browse services) for users who don't want to sign in
 * - Improves UX by explaining why the feature is locked
 * 
 * FEATURES:
 * - Dynamic icon and screen name based on the feature being accessed
 * - Two action buttons:
 *   1. Sign In / Sign Up - Navigates to BusinessOwnerHomeScreen for authentication
 *   2. Browse Services - Navigates to Home tab to browse as guest
 * - Supports multiple icon families (Ionicons, MaterialIcons, AntDesign)
 * - Informative messaging with friendly UI
 * 
 * USAGE:
 * This component is used as a base for three specific placeholder screens:
 * - MessagesPlaceholder: Shown when accessing Messages tab without auth
 * - ProfilePlaceholder: Shown when accessing Profile tab without auth
 * - PostPlaceholder: Shown when accessing Post Services tab without auth
 * 
 * NAVIGATION:
 * - Sign In button: Navigates to BusinessOwnerHomeScreen (auth flow entry)
 * - Browse button: Navigates to Home tab with guest mode parameters
 * 
 * @component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { createResponsiveStyles } from '../../Utils/globalStyles';

/**
 * Props interface for SignInPlaceholderScreen
 * 
 * @property {string} screenName - Display name of the feature requiring sign-in (e.g., "Messages", "Profile")
 * @property {string} iconName - Name of the icon to display from the specified icon family
 * @property {string} iconFamily - Icon library to use (Ionicons, MaterialIcons, or AntDesign)
 */
interface SignInPlaceholderScreenProps {
  screenName: string;
  iconName: string;
  iconFamily: 'Ionicons' | 'MaterialIcons' | 'AntDesign';
}

/**
 * Main SignInPlaceholderScreen Component
 * 
 * Displays a locked screen with sign-in prompt for protected features
 */
const SignInPlaceholderScreen: React.FC<SignInPlaceholderScreenProps> = ({ screenName, iconName, iconFamily }) => {
  // Get navigation object for programmatic navigation
  const navigation = useNavigation();

  /**
   * Handles sign-in button press
   * Navigates up through the navigation hierarchy to reach BusinessOwnerHomeScreen
   * 
   * Navigation hierarchy traversal:
   * 1. Try to get parent tab navigator
   * 2. Try to get root stack from tab navigator
   * 3. Navigate to BusinessOwnerHomeScreen using the appropriate navigator
   */
  const handleSignIn = () => {
    // Get the parent tab navigator
    const tabNavigator = navigation.getParent();
    // Get the root stack navigator (grandparent)
    const rootStack = tabNavigator?.getParent();
    
    // Navigate to BusinessOwnerHomeScreen (auth flow entry point)
    // Try different navigation levels to ensure it works regardless of navigation structure
    if (rootStack) {
      (rootStack as any).navigate('BusinessOwnerHomeScreen');
    } else if (tabNavigator) {
      (tabNavigator as any).navigate('BusinessOwnerHomeScreen');
    } else {
      (navigation as any).navigate('BusinessOwnerHomeScreen');
    }
  };

  /**
   * Handles browse services button press
   * Navigates to the Home tab where users can browse services without authentication
   * Sets parameters to indicate guest mode
   */
  const handleBrowseServices = () => {
    // Navigate within the tab navigator to Home tab
    // Pass parameters to indicate guest browsing mode
    (navigation as any).navigate('Home', {
      customerInfo: undefined, // No customer info since user is not signed in
      isGuest: false, // Guest browsing mode
      preselectedCategory: "" // No preselected category
    });
  };

  /**
   * Renders the appropriate icon based on the iconFamily prop
   * 
   * @returns Icon component from the specified icon family
   */
  // Render the appropriate icon
  const renderIcon = () => {
    const size = 80; // Large icon size for visual impact
    const color = '#ccc'; // Light gray color to indicate locked/disabled state
    
    // Switch between different icon families based on prop
    switch (iconFamily) {
      case 'Ionicons':
        return <Ionicons name={iconName as any} size={size} color={color} />;
      case 'MaterialIcons':
        return <MaterialIcons name={iconName as any} size={size} color={color} />;
      case 'AntDesign':
        return <AntDesign name={iconName as any} size={size} color={color} />;
      default:
        // Fallback to lock icon if invalid family specified
        return <Ionicons name="lock-closed-outline" size={size} color={color} />;
    }
  };

  return (
     <View style={styles.contentContainer}>
      {/* Display the feature-specific icon */}
      {renderIcon()}
      
      {/* Main heading */}
      <Text style={styles.title}>Sign In Required</Text>
      
      {/* Explanatory subtitle with dynamic screen name */}
      <Text style={styles.subtitle}>
        You need to be signed in to access {screenName.toLowerCase()}
      </Text>

      {/* Primary action: Sign In / Sign Up button */}
      <TouchableOpacity
        style={styles.signInButton}
        onPress={handleSignIn}
        activeOpacity={0.7} // Visual feedback on press
      >
        <Ionicons name="log-in-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
        <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
      </TouchableOpacity>

      {/* Secondary action: Browse Services button */}
      <TouchableOpacity
        style={styles.browseButton}
        onPress={handleBrowseServices}
        activeOpacity={0.7} // Visual feedback on press
      >
        <Ionicons name="search-outline" size={20} color="#4A90E2" style={styles.buttonIcon} />
        <Text style={styles.browseButtonText}>Browse Services</Text>
      </TouchableOpacity>

      {/* Footer text explaining guest browsing option */}
      <Text style={styles.footerText}>
        You can browse services without signing in
      </Text>
    </View>
  );
};

// ============================================================================
// EXPORTED PLACEHOLDER COMPONENTS
// ============================================================================
// These are pre-configured instances of SignInPlaceholderScreen for specific tabs

/**
 * MessagesPlaceholder Component
 * 
 * Placeholder screen for the Messages tab
 * Shown when unauthenticated users try to access chat/messaging features
 * 
 * @export
 */
// Create specific components for Messages, Profile, and Post
export const MessagesPlaceholder: React.FC = () => (
  <SignInPlaceholderScreen 
    screenName="Messages" 
    iconName="chatbubbles-outline" 
    iconFamily="Ionicons" 
  />
);

/**
 * ProfilePlaceholder Component
 * 
 * Placeholder screen for the Profile tab
 * Shown when unauthenticated users try to access profile features
 * 
 * @export
 */
// ✅ FIXED:
export const ProfilePlaceholder: React.FC = () => (
  <SignInPlaceholderScreen 
    screenName="Profile" 
    iconName="person"  // Correct icon name for MaterialIcons
    iconFamily="MaterialIcons" 
  />
);

/**
 * PostPlaceholder Component
 * 
 * Placeholder screen for the Post Services tab
 * Shown when unauthenticated users try to post/offer services
 * 
 * @export
 */
export const PostPlaceholder: React.FC = () => (
  <SignInPlaceholderScreen 
    screenName="Post Services" 
    iconName="pluscircleo" 
    iconFamily="AntDesign" 
  />
);

// ============================================================================
// STYLES
// ============================================================================
const styles = createResponsiveStyles({ 
  // Main container - centers content vertically and horizontally
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  // Main title styling
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  // Subtitle/description text styling
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  // Primary sign-in button styling (blue, filled)
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
    elevation: 5, // Android shadow
  },
  // Primary button text styling
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Secondary browse button styling (outlined)
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
  // Secondary button text styling
  browseButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Icon spacing within buttons
  buttonIcon: {
    marginRight: 4,
  },
  // Footer text styling (informational)
  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default SignInPlaceholderScreen;