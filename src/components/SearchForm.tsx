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

import React, { useCallback, memo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "../Utils/Alert";

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

  const pickerRef = useRef<any>(null);

  const handleCategoryChange = useCallback((itemValue: string) => {
    console.log("🔄 [SearchForm] Category changed to:", itemValue);
    setServiceNeeded(itemValue);
  }, [setServiceNeeded]);

  const openPicker = useCallback(() => {
    console.log('🔽 Opening picker...');
    if (pickerRef.current?.togglePicker) {
      pickerRef.current.togglePicker();
    }
  }, []);

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

  const pickerItems = categories.map(category => ({
    label: category,
    value: category,
  }));

  return (
    <View style={styles.searchSection}>
      <Text style={styles.subtitleText}>
        </Text>

      {/* ── Single row: Category | ZIP | Search ── */}
      <View style={styles.searchRow}>

        {/* Category Picker */}
        <View style={styles.searchRowPicker}>
          {categories.length === 0 ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Pressable style={styles.pickerInner} onPress={openPicker}>
              <RNPickerSelect
                ref={pickerRef}
                value={serviceNeeded}
                onValueChange={handleCategoryChange}
                items={pickerItems}
                placeholder={{ label: "Category...", value: null, color: '#999' }}
                style={pickerSelectStyles}
                disabled={categories.length === 0}
                useNativeAndroidPickerStyle={false}
              />
              <View style={styles.iconContainer} pointerEvents="none">
                <Ionicons name="chevron-down" size={16} color="#666" />
              </View>
            </Pressable>
          )}
        </View>

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
    flex: 3,                      // picker gets more space; ZIP is narrower
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    height: 46,
    justifyContent: "center",
  },

  pickerInner: {
    flex: 1,
    justifyContent: "center",
    position: 'relative',
  },

  zipInputInline: {
    flex: 0.7,
    height: 46,
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    borderRadius: 8,
    fontSize: 14,
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

  iconContainer: {
    position: 'absolute',
    right: 8,
    top: 13,
  },

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

// =============================================================================
// PICKER SELECT STYLES  — only picker-specific overrides here
// =============================================================================
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#333',
    paddingRight: 30,
    backgroundColor: 'transparent',
    borderRadius: 8,
    height: 46,
  },

  inputAndroid: {
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#333',
    paddingRight: 30,
    backgroundColor: 'transparent',
    borderRadius: 8,
    height: 46,
  },

  inputWeb: {
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#333',
    paddingRight: 30,
    backgroundColor: 'transparent',
    borderRadius: 8,
    height: 46,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
  } as any,

  modalViewTop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  } as any,

  modalViewMiddle: {
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: '60vh',
    overflowY: 'auto',
  } as any,

  placeholder: {
    color: '#999',
    fontSize: 14,
  },
});

export default memo(SearchForm);