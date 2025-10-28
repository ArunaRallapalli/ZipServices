import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

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
  return (
    <View style={styles.searchSection}>
      <Text style={styles.formLabel}>
        Business Name <Text style={styles.optionalText}>(optional)</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter business name"
        value={businessName}
        onChangeText={setBusinessName}
      />

      <Text style={styles.formLabel}>
        Service Category <Text style={styles.requiredText}>*</Text>
      </Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={serviceNeeded}
          onValueChange={(itemValue) => setServiceNeeded(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select a service..." value="" />
          {categories.map((category, index) => (
            <Picker.Item key={index} label={category} value={category} />
          ))}
        </Picker>
      </View>

      {isGuest && (
        <>
          <Text style={styles.formLabel}>
            ZIP Code <Text style={styles.requiredText}>*</Text>
          </Text>
          <View style={styles.zipSearchRow}>
            <TextInput
              style={[
                styles.input,
                styles.zipInput,
                isZipValid && styles.inputValid,
                zipCode.length === 5 && !isZipValid && styles.inputInvalid,
              ]}
              placeholder="Enter ZIP code"
              value={zipCode}
              onChangeText={onZipChange}
              keyboardType="numeric"
              maxLength={5}
            />
            <TouchableOpacity
              style={[
                styles.searchButton,
                (!serviceNeeded || !isZipValid) && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={!serviceNeeded || !isZipValid}
            >
              <Text style={styles.searchButtonText}>Search</Text>
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

          {!isZipValid && (
            <>
              <Text style={styles.manualEntryLabel}>
                Or enter location manually:
              </Text>
              <View style={styles.locationRow}>
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  placeholder="City"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    if (text && state) {
                      // Handle validation
                    }
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
  optionalText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "normal",
    fontStyle: "italic",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 15,
  },
  picker: {
    height: 50,
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
  searchButtonDisabled: {
    backgroundColor: "#4A90E2",
    opacity: 0.6,
  },
  searchButtonText: {
    color: "#FF0000",
    fontSize: 15,
    fontFamily: "Roboto-Bold",
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
});

export default SearchForm;