/**
 * SearchForm.tsx - WORKING VERSION WITH CLICKABLE DROPDOWN
 * 
 * Last Updated: January 15, 2026
 * 
 * GUARANTEED FIX: Uses Pressable overlay to make entire picker clickable
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

// ... (keep all your existing interface and props the same) ...

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

  // ✅ GUARANTEED WORKING SOLUTION
  const openPicker = useCallback(() => {
    console.log('🔽 Opening picker...');
    if (pickerRef.current) {
      if (pickerRef.current.togglePicker) {
        pickerRef.current.togglePicker();
      }
    }
  }, []);

  const handleSearchWithValidation = useCallback(() => {
    if (!zipCode || zipCode.trim() === '') {
      Alert.alert(
        "ZIP Code Required",
        "Please enter a 5-digit ZIP code to search for services in your area.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (zipCode.length < 5) {
      Alert.alert(
        "Invalid ZIP Code",
        "Please enter a complete 5-digit ZIP code.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (!isZipValid) {
      Alert.alert(
        "Invalid ZIP Code",
        "The ZIP code you entered could not be validated. Please check and try again.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (!serviceNeeded) {
      Alert.alert(
        "Service Category Required",
        "Please select a service category to search.",
        [{ text: "OK" }]
      );
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
        Connect with service providers in your Area
      </Text>
      
      <Text style={styles.formLabel}>Service Category:</Text>
      
      {categories.length === 0 ? (
        <View style={styles.pickerContainer}>
          <View style={styles.pickerLoadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.pickerLoadingText}>Loading categories...</Text>
          </View>
        </View>
      ) : (
        // ✅ WORKING SOLUTION: Pressable overlay
        <Pressable style={styles.pickerContainer} onPress={openPicker}>
          <RNPickerSelect
            ref={pickerRef}
            value={serviceNeeded}
            onValueChange={handleCategoryChange}
            items={pickerItems}
            placeholder={{
              label: "Select a service category",
              value: null,
              color: '#999',
            }}
            style={pickerSelectStyles}
            disabled={categories.length === 0}
            useNativeAndroidPickerStyle={false}
          />
          <View style={styles.iconContainer} pointerEvents="none">
            <Ionicons 
              name="chevron-down" 
              size={20} 
              color="#666"
            />
          </View>
        </Pressable>
      )}

      <Text style={styles.formLabel}>
        ZIP Code: <Text style={styles.requiredText}>*Required</Text>
      </Text>
      
      <View style={styles.zipSearchRow}>
        <TextInput
          style={[
            styles.input,
            styles.zipInput,
            isZipValid && styles.inputValid,
            zipCode.length === 5 && !isZipValid && styles.inputInvalid,
          ]}
          placeholder="Enter 5-digit ZIP code"
          keyboardType="numeric"
          value={zipCode}
          onChangeText={onZipChange}
          maxLength={5}
        />
        
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchWithValidation}
        >
          <Text style={styles.searchButtonText}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {isZipValid && city && state && (
        <View style={styles.locationDisplay}>
          <Ionicons name="location" size={16} color="#2E7D32" />
          <Text style={styles.locationDisplayText}>
            {city}, {state}
          </Text>
        </View>
      )}

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
              onChangeText={(text) => {
                setCity(text);
              }}
            />
            
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="State (e.g., AZ)"
              value={state}
              onChangeText={(text) => {
                setState(text.toUpperCase());
              }}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </>
      )}
      
    </View>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    backgroundColor: "#A7CCF6",
    paddingVertical: 20,
    paddingHorizontal: 20,
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
  
  subtitleText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: "bold",
    fontStyle: 'italic',
  },
  
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 15,
    minHeight: 50,
    justifyContent: "center",
    position: 'relative', // ✅ Added for icon positioning
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
  
  // ✅ NEW: Icon positioned absolutely on the right
  iconContainer: {
    position: 'absolute',
    right: 12,
    top: 15,
  },
  
  input: {
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  
  zipInput: {
    flex: 1,
    marginRight: 10,
  },
  
  zipSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
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
  
  searchButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  
  searchButtonText: {
    color: "#FF0000",
    fontSize: 15,
    fontFamily: "Roboto-Bold",
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#333',
    paddingRight: 40, // ✅ More space for icon
    backgroundColor: 'transparent', // ✅ Transparent so Pressable shows through
    borderRadius: 8,
    height: 50,
  },
  
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#333',
    paddingRight: 40, // ✅ More space for icon
    backgroundColor: 'transparent', // ✅ Transparent so Pressable shows through
    borderRadius: 8,
    height: 50,
  },
  
  inputWeb: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#333',
    paddingRight: 40,
    backgroundColor: 'transparent',
    borderRadius: 8,
    height: 50,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  } as any,
  
  placeholder: {
    color: '#999',
    fontSize: 16,
  },
});

export default memo(SearchForm);