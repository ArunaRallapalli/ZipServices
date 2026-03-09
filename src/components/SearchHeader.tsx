/**
 * SearchHeader Component — UPDATED: Shorter / more compact layout
 *
 * Changes from original:
 *  - Reduced paddingTop (60 → 40) and paddingVertical (30 → 16)
 *  - Subtitle trimmed to a single concise line
 *  - Welcome container margin reduced
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchHeaderProps {
  isAuthenticated: boolean;
  customerName?: string;
  onSignInPress: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  isAuthenticated,
  customerName,
  onSignInPress,
}) => {
  return (
    <View style={styles.headerSection}>
      {/* Title row */}
      <View style={styles.headerTitleContainer}>
        <Text style={styles.mainTitle}>Find Local Services</Text>

        {!isAuthenticated && (
          <TouchableOpacity onPress={onSignInPress} style={styles.signInIcon}>
            <Ionicons name="person-circle-outline" size={26} color="#ffffff" />
            <Text style={styles.signInIconText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Compact subtitle */}
      <Text style={styles.subtitle}>
        "Looking for local services or want to promote your business?{' '}
        <Text style={styles.subtitleLink}>Welcome to Gozipmarket.com</Text>
        {' '}— your local services marketplace."
      </Text>

      {/* Authenticated welcome badge */}
      {isAuthenticated && (
        <View style={styles.welcomeContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
          <Text style={styles.welcomeText}>
            Welcome{customerName ? `, ${customerName}` : ''}!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    backgroundColor: '#4A90E2',
    paddingTop: 40,           // ← was 60
    paddingBottom: 16,        // ← was 30
    paddingHorizontal: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,          // ← was 12
    position: 'relative',
  },
  mainTitle: {
    fontSize: 26,             // ← was 28
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,             // ← was 16
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,          // ← was 15
    fontStyle: 'italic',
  },
  subtitleLink: {
    color: '#FFE066',         // Yellow accent so the brand name pops
    fontWeight: '700',
    fontStyle: 'italic',
  },
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 6,       // ← was 8
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 6,             // ← was 10
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  signInIcon: {
    position: 'absolute',
    right: 0,
    padding: 4,
    alignItems: 'center',
  },
  signInIconText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SearchHeader;