import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

const brandData = [
  { label: 'Tarte', value: 'tarte' },
  { label: 'Too Faced', value: 'too_faced' },
  { label: 'MAC Cosmetics', value: 'mac' },
];

const productData = [
  { label: 'Shape Tape Concealer', value: 'shape_tape' },
  { label: 'Born This Way Foundation', value: 'born_this_way' },
  { label: 'Matte Lipstick', value: 'matte_lipstick' },
];

const shadeData = [
  { label: 'Light Neutral', value: 'light_neutral' },
  { label: 'Warm Beige', value: 'warm_beige' },
  { label: 'Ruby Woo', value: 'ruby_woo' },
];

const DropdownMenus = () => {
  const [brand, setBrand] = useState(null);
  const [product, setProduct] = useState(null);
  const [shade, setShade] = useState(null);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Brand</Text>
      <Dropdown
        style={styles.dropdown}
        data={brandData}
        labelField="label"
        valueField="value"
        placeholder="Select Brand"
        value={brand}
        onChange={item => setBrand(item.value)}
      />

      <Text style={styles.label}>Select Product</Text>
      <Dropdown
        style={styles.dropdown}
        data={productData}
        labelField="label"
        valueField="value"
        placeholder="Select Product"
        value={product}
        onChange={item => setProduct(item.value)}
      />

      <Text style={styles.label}>Select Shade</Text>
      <Dropdown
        style={styles.dropdown}
        data={shadeData}
        labelField="label"
        valueField="value"
        placeholder="Select Shade"
        value={shade}
        onChange={item => setShade(item.value)}
      />
    </View>
  );
};

export default DropdownMenus;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
  dropdown: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  label: {
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '600',
  },
});
