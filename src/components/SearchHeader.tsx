/**
 * SearchHeader Component
 * 
 * Displays the top header section of the search screen.
 * Shows app title, sign-in button (for guests), and welcome message (for authenticated users).
 * 
 * This is a PRESENTATIONAL component - receives state and handlers as props.
 * 
 * Used by: SearchResultsScreen (main container screen)
 * 
 * Features:
 * - App title/branding
 * - Conditional rendering based on authentication state:
 *   - Guest users: "Sign In" button with icon
 *   - Authenticated users: Welcome message with checkmark icon
 * - Subtitle with app tagline
 * - Blue gradient background for visual hierarchy
 * 
 * @component
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * SearchHeaderProps Interface
 * Props required by the SearchHeader component
 */
interface SearchHeaderProps {
  isAuthenticated: boolean;             // True if user is logged in
  customerName?: string;                // Optional name to display in welcome message
  onSignInPress: () => void;            // Callback when "Sign In" button is pressed
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SearchHeader: React.FC<SearchHeaderProps> = ({
  isAuthenticated,
  customerName,
  onSignInPress,
}) => {
  return (
    <View style={styles.headerSection}>
      {/* 
        Title Container
        - Holds the main app title and sign-in button
        - Uses relative positioning to allow sign-in button to float to the right
      */}
      <View style={styles.headerTitleContainer}>
        {/* 
          Main App Title
          - Centered, bold, white text
          - Primary branding element
        */}
        <Text style={styles.mainTitle}>Find Local Services</Text>

        {/* 
          Sign In Button
          - Only visible when user is NOT authenticated (guest mode)
          - Positioned absolutely to the right side
          - Icon + text for better UX
          - Navigates to sign-in screen when pressed
        */}
        {!isAuthenticated && (
          <TouchableOpacity onPress={onSignInPress} style={styles.signInIcon}>
            <Ionicons name="person-circle-outline" size={28} color="#ffffff" />
            <Text style={styles.signInIconText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 
        Subtitle
        - App tagline/description
        - Explains the purpose of the app
        - Semi-transparent white for hierarchy
      */}
     <Text style={[styles.subtitle, { fontWeight: 'bold' }]}>
  Turn your hidden skills into meaningful opportunities!!!
</Text>


      {/* 
        Welcome Message
        - Only visible when user IS authenticated
        - Shows personalized greeting with user's name
        - Green background with checkmark icon to indicate logged-in state
        - Centered below subtitle
      */}
      {isAuthenticated && (
        <View style={styles.welcomeContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
          <Text style={styles.welcomeText}>
            Welcome{customerName ? `, ${customerName}` : ""}!
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Main header section - blue background with extra top padding for status bar
  headerSection: {
    backgroundColor: "#4A90E2",
    paddingVertical: 30,
    paddingHorizontal: 20,
    paddingTop: 60,              // Extra padding for device status bar
  },
  
  // Container for title and sign-in button
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",        // Allows absolute positioning of children
  },
  
  // Main app title - large, bold, white
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  
  // Subtitle text - smaller, semi-transparent white
  subtitle: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.9,                // Slightly transparent for hierarchy
    marginBottom: 15,
  },
  
  // Welcome message container - green accent with rounded corners
  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(76, 175, 80, 0.2)",  // Semi-transparent green
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "center",         // Center horizontally
    marginTop: 10,
  },
  
  // Welcome text - white, medium weight
  welcomeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,               // Space between icon and text
  },
  
  // Sign-in button - positioned absolutely to the right
  signInIcon: {
    position: "absolute",
    right: 0,
    padding: 5,
    alignItems: "center",
  },
  
  // Sign-in button text - red for brand consistency, small font
  signInIconText: {
    color: "#FF0000",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default SearchHeader;

/**
 * ============================================================================
 * COMPONENT USAGE EXAMPLES
 * ============================================================================
 * 
 * // Example 1: Guest user (not authenticated)
 * <SearchHeader
 *   isAuthenticated={false}
 *   onSignInPress={() => navigation.navigate("SignIn")}
 * />
 * 
 * // Example 2: Authenticated user with name
 * <SearchHeader
 *   isAuthenticated={true}
 *   customerName="John Doe"
 *   onSignInPress={() => {}} // Not used when authenticated, but required prop
 * />
 * 
 * // Example 3: Authenticated user without name
 * <SearchHeader
 *   isAuthenticated={true}
 *   onSignInPress={() => {}}
 * />
 * 
 * ============================================================================
 * VISUAL STATES
 * ============================================================================
 * 
 * Guest User State:
 * ┌─────────────────────────────────────────┐
 * │  Find Local Services       [👤 Sign In] │
 * │  Connect with service providers in      │
 * │  your state                             │
 * └─────────────────────────────────────────┘
 * 
 * Authenticated User State:
 * ┌─────────────────────────────────────────┐
 * │       Find Local Services               │
 * │  Connect with service providers in      │
 * │  your state                             │
 * │       ✓ Welcome, John Doe!              │
 * └─────────────────────────────────────────┘
 * 
 * ============================================================================
 * DATA FLOW
 * ============================================================================
 * 
 * SearchResultsScreen (parent)
 *   └─> Gets authentication state from AuthContext
 *   └─> Gets customer name from route params or auth
 *   └─> Passes to SearchHeader
 *       └─> User clicks "Sign In"
 *           └─> onSignInPress callback
 *               └─> Navigates to sign-in screen
 * 
 * ============================================================================
 */