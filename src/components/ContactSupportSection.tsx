/**
 * ContactSupportSection Component - WEB OPTIMIZED
 * 
 * Reusable contact section that works in Profile, Search Results, and anywhere else
 * Provides email links with copy fallback for better UX
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Alert } from '../Utils/Alert';
import { Clipboard } from 'react-native';

interface ContactSupportProps {
  showTitle?: boolean;
  compact?: boolean;
}

export const ContactSupportSection: React.FC<ContactSupportProps> = ({ 
  showTitle = true,
  compact = false 
}) => {

  const copyToClipboard = (email: string) => {
    try {
      Clipboard.setString(email);
      Alert.alert('Copied!', `${email} copied to clipboard`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy email address');
    }
  };

  // ✅ WEB-OPTIMIZED: Create clickable email with native mailto
  const EmailLink: React.FC<{ email: string; label: string; icon: string }> = ({ email, label, icon }) => {
    // For web, use a native <a> tag wrapped in View
    if (Platform.OS === 'web') {
      return (
        <View style={styles.contactRow}>
          <a 
            href={`mailto:${email}`}
            style={{
              flex: 1,
              textDecoration: 'none',
              marginRight: 5,
            }}
          >
            <View style={styles.menuItem}>
              <Text style={styles.menuText}>{icon} {label}</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </a>
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={() => copyToClipboard(email)}
          >
            <Text style={styles.copyButtonText}>📋</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // For mobile (future Phase 2), use TouchableOpacity with Linking
    return (
      <View style={styles.contactRow}>
        <TouchableOpacity 
          style={[styles.menuItem, { flex: 1, marginRight: 5 }]} 
          onPress={() => {
            const Linking = require('react-native').Linking;
            Linking.openURL(`mailto:${email}`);
          }}
        >
          <Text style={styles.menuText}>{icon} {label}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.copyButton} 
          onPress={() => copyToClipboard(email)}
        >
          <Text style={styles.copyButtonText}>📋</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // COMPACT MODE (for footer)
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTitle}>Need Help?</Text>
        
        {/* Support Email */}
        <View style={styles.compactRow}>
          {Platform.OS === 'web' ? (
            <a 
              href="mailto:support@gozipmarket.com?subject=Support%20Request%20-%20ZipService"
              style={{ flex: 1, textDecoration: 'none', marginRight: 8 }}
            >
              <View style={styles.compactButton}>
                <Text style={styles.compactButtonText}>📧 support@gozipmarket.com</Text>
              </View>
            </a>
          ) : (
            <TouchableOpacity 
              style={styles.compactButton}
              onPress={() => {
                const Linking = require('react-native').Linking;
                Linking.openURL('mailto:support@gozipmarket.com?subject=Support%20Request%20-%20ZipService');
              }}
            >
              <Text style={styles.compactButtonText}>📧 support@gozipmarket.com</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.compactCopyButton}
            onPress={() => copyToClipboard('support@gozipmarket.com')}
          >
            <Text style={styles.copyIcon}>📋</Text>
          </TouchableOpacity>
        </View>

        {/* Business Email */}
        <View style={styles.compactRow}>
          {Platform.OS === 'web' ? (
            <a 
              href="mailto:business@gozipmarket.com?subject=Business%20Inquiry%20-%20ZipService"
              style={{ flex: 1, textDecoration: 'none', marginRight: 8 }}
            >
              <View style={styles.compactButton}>
                <Text style={styles.compactButtonText}>💼 business@gozipmarket.com</Text>
              </View>
            </a>
          ) : (
            <TouchableOpacity 
              style={styles.compactButton}
              onPress={() => {
                const Linking = require('react-native').Linking;
                Linking.openURL('mailto:business@gozipmarket.com?subject=Business%20Inquiry%20-%20ZipService');
              }}
            >
              <Text style={styles.compactButtonText}>💼 business@gozipmarket.com</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.compactCopyButton}
            onPress={() => copyToClipboard('business@gozipmarket.com')}
          >
            <Text style={styles.copyIcon}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // FULL MODE (for profile)
  return (
    <View>
      {showTitle && (
        <Text style={styles.sectionHeader}>Contact & Support</Text>
      )}
      
      <EmailLink 
        email="support@gozipmarket.com"
        label="Contact Support"
        icon="📧"
      />
      
      <EmailLink 
        email="business@gozipmarket.com"
        label="Business Inquiries"
        icon="💼"
      />
      
      <EmailLink 
        email="info@gozipmarket.com"
        label="General Information"
        icon="ℹ️"
      />
      
      <EmailLink 
        email="support@gozipmarket.com"
        label="Report a Bug"
        icon="🐛"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (keep all your existing styles)
  sectionHeader: { 
    fontWeight: 'bold', 
    fontSize: 18, 
    marginTop: 25, 
    marginBottom: 15, 
    color: '#333', 
    borderBottomWidth: 1, 
    borderBottomColor: '#ddd', 
    paddingBottom: 5 
  },
  contactRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  menuItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 15, 
    paddingHorizontal: 15, 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#e0e0e0' 
  },
  menuText: { 
    fontSize: 16, 
    color: '#333', 
    fontWeight: '500' 
  },
  arrow: { 
    fontSize: 20, 
    color: '#999' 
  },
  copyButton: {
    backgroundColor: '#4A90E2',
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#357ABD',
  },
  copyButtonText: {
    fontSize: 20,
  },
  compactContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  compactButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    textAlign: 'center',
  },
  compactCopyButton: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyIcon: {
    fontSize: 18,
  },
});