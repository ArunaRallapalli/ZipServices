// components/Footer.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

export const Footer = () => {
  const openEmail = (email: string, subject: string = '') => {
    Linking.openURL(`mailto:${email}${subject ? `?subject=${subject}` : ''}`);
  };

  return (
    <View style={styles.footer}>
      <Text style={styles.title}>Need Help?</Text>
      
      <TouchableOpacity 
        onPress={() => openEmail('zipmarket333@gmail.com', 'Support Request')}
        style={styles.linkContainer}
      >
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.link}>zipmarket333@gmail.com</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => openEmail('zipmarket333@gmail.com', 'Business Inquiry')}
        style={styles.linkContainer}
      >
        <Text style={styles.icon}>💼</Text>
        <Text style={styles.link}>zipmarket333@gmail.com</Text>
      </TouchableOpacity>

      <Text style={styles.copyright}>© 2025 GoZipMarket - Zip Market LLC</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    marginTop: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  link: {
    fontSize: 14,
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
  copyright: {
    fontSize: 12,
    color: '#666',
    marginTop: 15,
  },
});