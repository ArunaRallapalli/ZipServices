/**
 * SearchForm.tsx
 * 
 * OVERVIEW:
 * Form component for inputting search criteria to find service providers.
 * Provides input fields for service category, ZIP code, and optional city/state.
 * 
 * KEY FEATURES:
 * - Category picker dropdown with dynamic options from API
 * - ZIP code input with real-time validation (green/red border)
 * - Auto-populated city/state display when ZIP is valid
 * - Manual city/state input fallback for invalid ZIPs
 * - Alert validation messages for invalid inputs
 * - Loading state while categories are fetched
 * - Visual feedback for input validation
 * 
 * VALIDATION:
 * - ZIP code must be 5 digits and valid (verified via API)
 * - Service category must be selected
 * - Alert messages guide user to correct invalid inputs
 * 
 * STYLING:
 * - Light blue background (#A7CCF6)
 * - Green border for valid ZIP code
 * - Red border for invalid ZIP code
 * - Red text on search button for high visibility
 */

import React, { useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

// ============================================================================
// COMPONENT PROPS INTERFACE
// ============================================================================

interface SearchFormProps {
  // Business name search (optional field)
  businessName: string;
  setBusinessName: (value: string) => void;
  
  // ZIP code input with validation
  zipCode: string;
  setZipCode: (value: string) => void;
  
  // Location fields (auto-populated or manual)
  city: string;
  setCity: (value: string) => void;
  state: string;
  setState: (value: string) => void;
  
  // Service category selection
  serviceNeeded: string;
  setServiceNeeded: (value: string) => void;
  
  // Categories list from API
  categories: string[];
  
  // Validation and user state
  isZipValid: boolean;           // ZIP has been validated via API
  isGuest: boolean;              // User is not logged in
  
  // Action handlers
  handleSearch: () => void;      // Execute search
  onZipChange: (text: string) => void;  // ZIP input with debounced validation
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  
  // --------------------------------------------------------------------------
  // EVENT HANDLERS (Memoized to prevent unnecessary re-renders)
  // --------------------------------------------------------------------------
  
  /**
   * Handles category selection from dropdown picker
   * Logs the change for debugging purposes
   * 
   * @param itemValue - The selected category value
   */
  const handleCategoryChange = useCallback((itemValue: string) => {
    console.log("🔄 [SearchForm] Category changed to:", itemValue);
    setServiceNeeded(itemValue);
  }, [setServiceNeeded]);

  /**
   * Validates all inputs and shows appropriate alert if invalid
   * Proceeds with search only if all validations pass
   */
  const handleSearchWithValidation = useCallback(() => {
    // Validate ZIP code is entered
    if (!zipCode || zipCode.trim() === '') {
      Alert.alert(
        "ZIP Code Required",
        "Please enter a 5-digit ZIP code to search for services in your area.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Validate ZIP code has 5 digits
    if (zipCode.length < 5) {
      Alert.alert(
        "Invalid ZIP Code",
        "Please enter a complete 5-digit ZIP code.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Validate ZIP code is valid (verified via API)
    if (!isZipValid) {
      Alert.alert(
        "Invalid ZIP Code",
        "The ZIP code you entered could not be validated. Please check and try again.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Validate service category is selected
    if (!serviceNeeded) {
      Alert.alert(
        "Service Category Required",
        "Please select a service category to search.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // All validations passed, proceed with search
    handleSearch();
  }, [zipCode, isZipValid, serviceNeeded, handleSearch]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  
  return (
    <View style={styles.searchSection}>
      
      {/* ====================================================================
          SERVICE CATEGORY PICKER
          ==================================================================== */}
      
      <Text style={styles.formLabel}>Service Category:</Text>
      
      {/* Show loading indicator while categories are being fetched */}
      {categories.length === 0 ? (
        <View style={styles.pickerContainer}>
          <View style={styles.pickerLoadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.pickerLoadingText}>Loading categories...</Text>
          </View>
        </View>
      ) : (
        // Render dropdown picker with available categories
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={serviceNeeded}
            onValueChange={handleCategoryChange}
            style={styles.picker}
            enabled={categories.length > 0}  // Disable if no categories loaded
          >
            {/* Map through categories to create picker items */}
            {categories.map((category) => (
              <Picker.Item 
                key={category} 
                label={category} 
                value={category} 
              />
            ))}
          </Picker>
        </View>
      )}

      {/* ====================================================================
          ZIP CODE INPUT AND SEARCH BUTTON
          ==================================================================== */}
      
      <Text style={styles.formLabel}>
        ZIP Code: <Text style={styles.requiredText}>*Required</Text>
      </Text>
      
      {/* Row containing ZIP input and search button */}
      <View style={styles.zipSearchRow}>
        
        {/* ZIP Code Input Field
            - Green border when valid
            - Red border when invalid (5 digits entered but not valid)
            - Normal border otherwise */}
        <TextInput
          style={[
            styles.input,
            styles.zipInput,
            isZipValid && styles.inputValid,                                    // Green for valid
            zipCode.length === 5 && !isZipValid && styles.inputInvalid,        // Red for invalid
          ]}
          placeholder="Enter 5-digit ZIP code"
          keyboardType="numeric"
          value={zipCode}
          onChangeText={onZipChange}  // Triggers debounced validation
          maxLength={5}                // Limit to 5 digits
        />
        
        {/* Search Button
            - Always enabled and clickable
            - Shows validation alerts when clicked with invalid inputs */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchWithValidation}
        >
          <Text style={styles.searchButtonText}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* ====================================================================
          LOCATION DISPLAY (Valid ZIP)
          ==================================================================== */}
      
      {/* Show city/state when ZIP is valid */}
      {isZipValid && city && state && (
        <View style={styles.locationDisplay}>
          <Ionicons name="location" size={16} color="#2E7D32" />
          <Text style={styles.locationDisplayText}>
            {city}, {state}
          </Text>
        </View>
      )}

      {/* ====================================================================
          MANUAL LOCATION ENTRY (Invalid ZIP)
          ==================================================================== */}
      
      {/* Show manual entry fields when ZIP is 5 digits but invalid */}
      {zipCode.length === 5 && !isZipValid && (
        <>
          <Text style={styles.manualEntryLabel}>
            Can't find your ZIP? Enter manually:
          </Text>
          
          {/* Row with city and state inputs */}
          <View style={styles.locationRow}>
            
            {/* City Input */}
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="City"
              value={city}
              onChangeText={(text) => {
                setCity(text);
              }}
            />
            
            {/* State Input (2-letter abbreviation) */}
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="State (e.g., AZ)"
              value={state}
              onChangeText={(text) => {
                setState(text.toUpperCase());  // Auto-capitalize
              }}
              maxLength={2}                     // Limit to 2 characters
              autoCapitalize="characters"       // Uppercase keyboard
            />
          </View>
        </>
      )}
      
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Main container with blue background
  searchSection: {
    backgroundColor: "#A7CCF6",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  
  // Form field labels
  formLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  
  // Red asterisk for required fields
  requiredText: {
    color: "#FF4500",
    fontSize: 14,
    fontWeight: "normal",
  },
  
  // ============================================================================
  // PICKER STYLES
  // ============================================================================
  
  // Container for category picker
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 15,
    minHeight: 50,
    justifyContent: "center",
  },
  
  // Loading state for picker (while fetching categories)
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
  
  // Actual picker component
  picker: {
    height: 50,
  },
  
  // ============================================================================
  // INPUT FIELD STYLES
  // ============================================================================
  
  // Base input field style
  input: {
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  
  // ZIP code specific styling (shares row with button)
  zipInput: {
    flex: 1,
    marginRight: 10,
  },
  
  // Row layout for ZIP and search button
  zipSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  
  // Green border for valid ZIP code
  inputValid: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  
  // Red border for invalid ZIP code
  inputInvalid: {
    borderColor: "#FF4500",
    borderWidth: 2,
  },
  
  // ============================================================================
  // LOCATION FIELD STYLES
  // ============================================================================
  
  // Label for manual entry section
  manualEntryLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    marginBottom: 8,
    fontStyle: "italic",
  },
  
  // Row layout for city and state inputs
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  
  // Individual location input (city or state)
  locationInput: {
    flex: 0.48,  // Each takes 48% width (with gap between)
  },
  
  // Display box showing validated location
  locationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",  // Light green tint
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  
  locationDisplayText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#2E7D32",  // Dark green text
    fontWeight: "600",
  },
  
  // ============================================================================
  // SEARCH BUTTON STYLES
  // ============================================================================
  
  // Search button base style
  searchButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  
  // Search button text (red for high visibility)
  searchButtonText: {
    color: "#FF0000",
    fontSize: 15,
    fontFamily: "Roboto-Bold",
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
});

// Wrap component in memo to prevent unnecessary re-renders when props haven't changed
export default memo(SearchForm);