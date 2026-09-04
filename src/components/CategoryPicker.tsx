/**
 * CategoryPicker.tsx
 *
 * [2026-08-30] [feature/category-search-picker] Created — the category dropdown
 * in PostServiceScreen/EditListing used @react-native-picker/picker directly.
 * On web, Picker renders as a native HTML <select>, so the browser gives you
 * free type-ahead (press "l" then "a" to jump to "Landscaping"). On iOS/Android
 * the native wheel/dialog picker has no such search — with 100+ categories,
 * finding one means scrolling the whole list. This component keeps Picker
 * (and its web type-ahead) unchanged on web, and on native swaps in a
 * tap-to-open sheet with a search box + filtered list, so typing "la" narrows
 * to "Landscaping" the same way it already does on web.
 */

import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

interface CategoryOption {
  category_name: string;
  [key: string]: any;
}

interface CategoryPickerProps {
  categories: CategoryOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  pickerStyle?: StyleProp<ViewStyle>;
}

export default function CategoryPicker({
  categories,
  selectedValue,
  onValueChange,
  disabled,
  containerStyle,
  pickerStyle,
}: CategoryPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  // Web already gets free type-ahead from the browser's native <select> —
  // leave this path exactly as it was.
  if (Platform.OS === "web") {
    return (
      <View style={containerStyle}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={pickerStyle}
          enabled={!disabled}
        >
          <Picker.Item label="Select a category..." value="" />
          {categories.map((category) => (
            <Picker.Item
              key={category.category_name}
              label={category.category_name}
              value={category.category_name}
            />
          ))}
        </Picker>
      </View>
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.category_name.toLowerCase().includes(q));
  }, [search, categories]);

  const openModal = () => {
    if (disabled) return;
    setSearch("");
    setModalVisible(true);
  };

  const selectCategory = (name: string) => {
    onValueChange(name);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, containerStyle, disabled && styles.triggerDisabled]}
        onPress={openModal}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selectedValue && styles.placeholderText]} numberOfLines={1}>
          {selectedValue || "Select a category..."}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select a category</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Type to search, e.g. 'la' for Landscaping"
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCorrect={false}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.category_name}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>No categories match "{search}"</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => selectCategory(item.category_name)}>
                  <Text style={[styles.rowText, item.category_name === selectedValue && styles.rowTextSelected]}>
                    {item.category_name}
                  </Text>
                  {item.category_name === selectedValue && (
                    <Ionicons name="checkmark" size={18} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  triggerDisabled: { opacity: 0.6 },
  triggerText: { fontSize: 15, color: "#1a1a1a", flex: 1 },
  placeholderText: { color: "#999" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  overlayTouchable: { flex: 1 },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "75%",
    paddingBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rowText: { fontSize: 15, color: "#333" },
  rowTextSelected: { color: "#4A90E2", fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#999", paddingVertical: 24, fontSize: 14 },
});
