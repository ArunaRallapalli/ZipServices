import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Ionicons,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

interface Category {
  name: string;
  family: "Ionicons" | "FontAwesome" | "MaterialCommunityIcons";
  icon: string;
  color: string;
  bgColor: string;
}

interface SearchCategoryTilesProps {
  categories: Category[];
  onCategoryPress: (categoryName: string) => void;
  isZipValid: boolean;
}

const SearchCategoryTiles: React.FC<SearchCategoryTilesProps> = ({
  categories,
  onCategoryPress,
  isZipValid,
}) => {
  const renderIcon = (category: Category) => {
    const iconProps = {
      name: category.icon as any,
      size: 32,
      color: category.color,
    };

    switch (category.family) {
      case "Ionicons":
        return <Ionicons {...iconProps} />;
      case "FontAwesome":
        return <FontAwesome {...iconProps} />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons {...iconProps} />;
      default:
        return <Ionicons name="help-circle" size={32} color="#999" />;
    }
  };

  const renderCategoryTile = (category: Category, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.categoryTile,
        { backgroundColor: category.bgColor, borderColor: category.color },
      ]}
      onPress={() => onCategoryPress(category.name)}
      disabled={!isZipValid}
      activeOpacity={0.7}
    >
      {renderIcon(category)}
      <Text style={[styles.categoryTileText, { color: category.color }]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.contentSection}>
      <Text style={styles.sectionTitle}>Popular Service Categories</Text>

      {!isZipValid && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={20} color="#FF8C00" />
          <Text style={styles.warningText}>
            Enter a valid ZIP code to search for services
          </Text>
        </View>
      )}

      <View style={styles.tilesContainer}>
        {categories.map((category, index) => renderCategoryTile(category, index))}
      </View>

      <Text style={styles.browseText}>
        Browse our most requested services and find what you need in your area
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  contentSection: {
    backgroundColor: "#ffffff",
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    marginTop: 10,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4E5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8C00",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    marginLeft: 10,
    fontWeight: "500",
  },
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  categoryTile: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 8,
  },
  categoryTileText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "bold",
  },
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