/**
 * SearchForm.tsx - WORKING VERSION WITH CLICKABLE DROPDOWN
 *
 * Last Updated: March 2026
 *
 * CHANGES:
 * - Category picker, ZIP input, and Search button now on one row
 * - Search button is white with blue border/text
 * - Fixed: new styles moved into `styles` (not pickerSelectStyles)
 */

import React, { useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "../Utils/Alert";
// [2026-09-08] [feature/category-search-picker] was react-native-picker-select
// (RNPickerSelect) — no way to type "land" and jump to "Landscaping" on
// mobile, same gap CategoryPicker already fixed for the posting screens.
// Reusing that component here instead of a second, separate picker.
import CategoryPicker from './CategoryPicker';

interface SearchFormProps {
  businessName: string;
  setBusinessName: (value: string) => void;
  zipCode: string;
  setZipCode: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  state: string;
  setState: (value: string) => void;
  serviceNeeded: string;
  setServiceNeeded: (value: string) => void;
  categories: string[];
  isZipValid: boolean;
  isGuest: boolean;
  handleSearch: () => void;
  onZipChange: (text: string) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({
  businessName,
  setBusinessName,
  zipCode,
  setZipCode,
  city,
  setCity,
  state,
  setState,
  serviceNeeded,
  setServiceNeeded,
  categories,
  isZipValid,
  isGuest,
  handleSearch,
  onZipChange,
}) => {

  const handleCategoryChange = useCallback((itemValue: string) => {
    console.log("🔄 [SearchForm] Category changed to:", itemValue);
    setServiceNeeded(itemValue);
  }, [setServiceNeeded]);

  const handleSearchWithValidation = useCallback(() => {
    if (!zipCode || zipCode.trim() === '') {
      Alert.alert("ZIP Code Required", "Please enter a 5-digit ZIP code to search for services in your area.", [{ text: "OK" }]);
      return;
    }
    if (zipCode.length < 5) {
      Alert.alert("Invalid ZIP Code", "Please enter a complete 5-digit ZIP code.", [{ text: "OK" }]);
      return;
    }
    if (!serviceNeeded) {
      Alert.alert("Service Category Required", "Please select a service category to search.", [{ text: "OK" }]);
      return;
    }
    handleSearch();
  }, [zipCode, isZipValid, serviceNeeded, handleSearch]);

  return (
    <View style={styles.searchSection}>
      <Text style={styles.subtitleText}>
        </Text>

      {/* ── Single row: Category | ZIP | Search ── */}
      <View style={styles.searchRow}>

        {/* Category Picker — [2026-09-08] [feature/category-search-picker]
            was RNPickerSelect; now reuses CategoryPicker (searchable on native,
            same as the posting-screen category dropdown) so typing "land"
            jumps to "Landscaping" here too instead of scrolling a long list. */}
        {categories.length === 0 ? (
          <View style={styles.searchRowPicker}>
            <ActivityIndicator size="small" color="#4A90E2" />
          </View>
        ) : (
          <CategoryPicker
            categories={categories.map(category => ({ category_name: category }))}
            selectedValue={serviceNeeded}
            onValueChange={handleCategoryChange}
            containerStyle={styles.searchRowPicker}
          />
        )}

        {/* ZIP Input */}
        <TextInput
          style={[
            styles.zipInputInline,
            isZipValid && styles.inputValid,
            zipCode.length === 5 && !isZipValid && styles.inputInvalid,
          ]}
          placeholder="ZIP"
          keyboardType="numeric"
          value={zipCode}
          onChangeText={onZipChange}
          maxLength={5}
          onSubmitEditing={handleSearchWithValidation}
          returnKeyType="search"
        />

        {/* Search Button */}
        <TouchableOpacity
          style={styles.searchButtonInline}
          onPress={handleSearchWithValidation}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>

      </View>
      {/* ── End single row ── */}

      {/* Location confirmation */}
      {isZipValid && city && state && (
        <View style={styles.locationDisplay}>
          <Ionicons name="location" size={16} color="#2E7D32" />
          <Text style={styles.locationDisplayText}>
            {city}, {state}
          </Text>
        </View>
      )}

      {/* Manual city/state fallback */}
      {zipCode.length === 5 && !isZipValid && (
        <>
          <Text style={styles.manualEntryLabel}>
            Can't find your ZIP? Enter manually:
          </Text>
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="City"
              value={city}
              onChangeText={(text) => setCity(text)}
            />
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="State (e.g., AZ)"
              value={state}
              onChangeText={(text) => setState(text.toUpperCase())}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </>
      )}

    </View>
  );
};

// =============================================================================
// STYLES  — all new styles live here, not in pickerSelectStyles
// =============================================================================
const styles = StyleSheet.create({
  searchSection: {
    backgroundColor: "#A7CCF6",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },

  subtitleText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: "bold",
    fontStyle: 'italic',
  },

  formLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },

  requiredText: {
    color: "#FF4500",
    fontSize: 14,
    fontWeight: "normal",
  },

  // ── One-row layout ──────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },

  searchRowPicker: {
    flex: 1,                      // takes all space not used by fixed-width ZIP and Search
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    height: 46,
    justifyContent: "center",
  },

  zipInputInline: {
    width: 58,                    // fixed — just enough for 5 digits on all platforms
    height: 46,
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
    paddingHorizontal: 4,
    borderRadius: 8,
    fontSize: 13,
    textAlign: 'center',
  },

  searchButtonInline: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#4A90E2",
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  searchButtonText: {
    color: "#4A90E2",             // blue text on white button
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  // ── End one-row layout ──────────────────────────────────────────────────────

  input: {
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },

  inputValid: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },

  inputInvalid: {
    borderColor: "#FF4500",
    borderWidth: 2,
  },

  manualEntryLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    marginBottom: 8,
    fontStyle: "italic",
  },

  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  locationInput: {
    flex: 0.48,
  },

  locationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },

  locationDisplayText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },

  // kept for any legacy references
  zipInput: {
    flex: 1,
    marginRight: 10,
  },

  zipSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 15,
    minHeight: 50,
    justifyContent: "center",
    position: 'relative',
  },

  pickerLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 10,
  },

  pickerLoadingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
});

export default memo(SearchForm);