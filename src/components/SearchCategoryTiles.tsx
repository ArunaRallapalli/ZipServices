/**
 * SearchCategoryTiles Component
 * 
 * Displays a grid of popular service category tiles.
 * Each tile is a touchable card with an icon, name, and custom color scheme.
 * 
 * This is a PRESENTATIONAL component - receives categories and handlers as props.
 * 
 * Used by: SearchResultsScreen (main container screen)
 * 
 * Features:
 * - 3-column grid layout (responsive)
 * - Each tile has a unique icon, color, and background
 * - Disabled state when ZIP code is not valid (with warning banner)
 * - Visual feedback on press (opacity change)
 * - Quick access to search by clicking a category
 * 
 * @component
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Ionicons,
  FontAwesome,
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
  AntDesign,
} from "@expo/vector-icons";
import { Alert } from "../Utils/Alert";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * IconFamily Type
 * Union type for supported icon libraries
 */
type IconFamily = 
  | "Ionicons" 
  | "FontAwesome" 
  | "FontAwesome5" 
  | "MaterialCommunityIcons" 
  | "MaterialIcons" 
  | "AntDesign";

/**
 * Category Interface
 * Represents a single category tile configuration
 */
interface Category {
  name: string;           // Display name (e.g., "Catering", "Plumbing")
  family: IconFamily;     // Which icon library to use
  icon: string;           // Icon name from the specified library
  color: string;          // Primary color for icon and text
  bgColor: string;        // Background color for the tile
}

/**
 * SearchCategoryTilesProps Interface
 * Props required by the SearchCategoryTiles component
 */
interface SearchCategoryTilesProps {
  categories: Category[];                       // Array of categories to display
  onCategoryPress: (categoryName: string) => void;  // Callback when a tile is pressed
  isZipValid: boolean;                          // Whether ZIP code is valid (enables/disables tiles)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SearchCategoryTiles: React.FC<SearchCategoryTilesProps> = ({
  categories,
  onCategoryPress,
  isZipValid,
}) => {
  /**
   * Get the appropriate icon component based on icon family name
   * 
   * @param family - Name of the icon library
   * @returns The icon component constructor
   */
  const getIconComponent = (family: IconFamily) => {
    switch (family) {
      case "Ionicons":
        return Ionicons;
      case "FontAwesome":
        return FontAwesome;
      case "FontAwesome5":
        return FontAwesome5;
      case "MaterialCommunityIcons":
        return MaterialCommunityIcons;
      case "MaterialIcons":
        return MaterialIcons;
      case "AntDesign":
        return AntDesign;
      default:
        // Fallback to Ionicons if unknown family
        return Ionicons;
    }
  };

  /**
   * Render a single category tile
   * 
   * @param category - The category configuration object
   * @param index - Array index (used for unique key)
   * @returns A TouchableOpacity with icon and text
   */
const renderCategoryTile = (category: Category, index: number) => {
  const IconComponent = getIconComponent(category.family);

  return (
    <TouchableOpacity
      key={`category-${index}-${category.name}`}
      style={[
        styles.categoryTile,
        { 
          backgroundColor: category.bgColor,
          borderColor: category.color
        },
      ]}
      onPress={() => {
        if (!isZipValid) {
          Alert.alert(
            "ZIP Code Required",
            "Please enter a valid ZIP code before selecting a category."
          );
          return;
        }
        onCategoryPress(category.name);
      }}
      activeOpacity={0.7}
    >
      <IconComponent 
        name={category.icon} 
        size={24} 
        color={category.color}
        suppressHighlighting={true}
      />
      
      <Text style={[styles.categoryTileText, { color: category.color }]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

  return (
    <View style={styles.contentSection}>
      {/* 
        Section Title
        - Heading for the category tiles section
      */}
      <Text style={styles.sectionTitle}>Popular Service Categories</Text>
      
      {/* 
        Warning Banner
        - Only visible when ZIP code is NOT valid
        - Informs user they need to enter a valid ZIP before selecting a category
        - Orange color scheme to indicate warning/caution
      */}
      {!isZipValid && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={20} color="#FF8C00" />
          <Text style={styles.warningText}>
            Enter a valid ZIP code to search for services
          </Text>
        </View>
      )}

      {/* 
        Category Tiles Grid
        - 3-column layout using flexbox
        - Each tile is ~30% width with spacing
        - Wraps to next row automatically
        - Maps over categories array to render tiles
      */}
      <View style={styles.tilesContainer}>
        {categories.map((category, index) => renderCategoryTile(category, index))}
      </View>

      {/* 
        Browse Text
        - Descriptive text explaining the purpose
        - Centered, italic, gray
      */}
      <Text style={styles.browseText}>
        Browse our most requested services and find what you need in your area
      </Text>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Main content section - white background with padding
  contentSection: {
    backgroundColor: "#ffffff",
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  
  // Section title - bold, large, dark text
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    marginTop: 10,
  },
  
  // Warning banner - orange theme to indicate caution
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4E5",      // Light orange background
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8C00",      // Orange accent border
  },
  
  // Warning text - dark text on light background
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    marginLeft: 10,                  // Space between icon and text
    fontWeight: "500",
  },
  
  // Grid container for category tiles
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",                // Allow tiles to wrap to next row
    justifyContent: "space-between", // Even spacing between tiles
    marginBottom: 20,
  },
  
  // Individual category tile
  categoryTile: {
    width: "30%",                    // 3 tiles per row with spacing
    aspectRatio: 1,                  // Square shape (equal width and height)
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    // Shadow for Android
    elevation: 5,
    padding: 8,
  },
  
  // Category name text - bold, small, centered
  categoryTileText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,                    // Space between icon and text
    fontWeight: "bold",
  },
  
  // Browse text - descriptive subtext, centered, italic, gray
  browseText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
    fontStyle: "italic",
  },
});

export default SearchCategoryTiles;

/**
 * ============================================================================
 * COMPONENT USAGE EXAMPLE
 * ============================================================================
 * 
 * import { popularCategories } from "../Utils/searchUtils";
 * 
 * <SearchCategoryTiles
 *   categories={[
 *     { 
 *       name: "Catering", 
 *       family: "Ionicons", 
 *       icon: "restaurant", 
 *       color: "#FF6B6B", 
 *       bgColor: "#FFE5E5" 
 *     },
 *     { 
 *       name: "Plumbing", 
 *       family: "MaterialCommunityIcons", 
 *       icon: "wrench", 
 *       color: "#FF4500", 
 *       bgColor: "#FFE8E0" 
 *     },
 *     // ... more categories
 *   ]}
 *   isZipValid={true}
 *   onCategoryPress={(categoryName) => {
 *     console.log(`Category selected: ${categoryName}`);
 *     // Trigger search with selected category
 *     setServiceNeeded(categoryName);
 *     performSearch();
 *   }}
 * />
 * 
 * ============================================================================
 * VISUAL LAYOUT
 * ============================================================================
 * 
 * ┌─────────────────────────────────────────────────┐
 * │  Popular Service Categories                     │
 * │                                                  │
 * │  ⚠️ Enter a valid ZIP code to search...         │ (if !isZipValid)
 * │                                                  │
 * │  ┌──────┐  ┌──────┐  ┌──────┐                  │
 * │  │  🍽️  │  │  💄  │  │  🎨  │                  │
 * │  │ Food │  │Beauty│  │ Decor│                  │
 * │  └──────┘  └──────┘  └──────┘                  │
 * │                                                  │
 * │  ┌──────┐  ┌──────┐  ┌──────┐                  │
 * │  │  👔  │  │  🧹  │  │  🔧  │                  │
 * │  │Tailor│  │ Clean│  │ Plumb│                  │
 * │  └──────┘  └──────┘  └──────┘                  │
 * │                                                  │
 * │  Browse our most requested services...          │
 * └─────────────────────────────────────────────────┘
 * 
 * ============================================================================
 * DATA FLOW
 * ============================================================================
 * 
 * searchUtils.ts
 *   └─> Exports popularCategories array (6 categories)
 *       └─> SearchResultsScreen imports it
 *           └─> Passes to SearchCategoryTiles
 *               └─> Renders 3x2 grid of tiles
 *                   └─> User clicks a tile
 *                       └─> onCategoryPress(categoryName) fired
 *                           └─> SearchResultsScreen handles it
 *                               └─> Sets serviceNeeded
 *                               └─> Performs search
 *                               └─> Shows results
 * 
 * ============================================================================
 * ICON FAMILIES SUPPORTED
 * ============================================================================
 * 
 * - Ionicons: General purpose icons (e.g., restaurant, location)
 * - FontAwesome: Classic icon set (e.g., paint-brush)
 * - FontAwesome5: Updated FA icons (e.g., user-circle)
 * - MaterialCommunityIcons: Material Design icons (e.g., wrench, broom)
 * - MaterialIcons: Standard Material icons (e.g., settings)
 * - AntDesign: Ant Design icon library (e.g., home)
 * 
 * Each category can use a different icon family for maximum flexibility.
 * 
 * ============================================================================
 */