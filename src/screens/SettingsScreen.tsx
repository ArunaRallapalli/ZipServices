import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUserData(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['token', 'user']);
              router.replace('/signin');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openEmail = (email: string, subject: string = '') => {
    const url = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening email:', err);
      Alert.alert('Error', 'Unable to open email client');
    });
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingItem = ({
    icon,
    label,
    onPress,
    showArrow = true,
    rightComponent,
  }: {
    icon: string;
    label: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={22} color="#4A90E2" style={styles.settingIcon} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {rightComponent || (showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color="#999" />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        {userData && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData.full_name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>
        )}
      </View>

      {/* Account Settings */}
      <SettingSection title="Account">
        <SettingItem
          icon="person-outline"
          label="Edit Profile"
          onPress={() => {
            // Navigate to edit profile
            Alert.alert('Coming Soon', 'Profile editing will be available soon!');
          }}
        />
        <SettingItem
          icon="key-outline"
          label="Change Password"
          onPress={() => {
            // Navigate to change password
            Alert.alert('Coming Soon', 'Password change will be available soon!');
          }}
        />
        <SettingItem
          icon="shield-checkmark-outline"
          label="Privacy"
          onPress={() => {
            // Navigate to privacy settings
            Alert.alert('Coming Soon', 'Privacy settings will be available soon!');
          }}
        />
      </SettingSection>

      {/* Notifications */}
      <SettingSection title="Notifications">
        <SettingItem
          icon="notifications-outline"
          label="Push Notifications"
          showArrow={false}
          rightComponent={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ccc', true: '#4A90E2' }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          }
        />
        <SettingItem
          icon="mail-outline"
          label="Email Notifications"
          showArrow={false}
          rightComponent={
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#ccc', true: '#4A90E2' }}
              thumbColor={emailNotifications ? '#fff' : '#f4f3f4'}
            />
          }
        />
      </SettingSection>

      {/* Help & Support */}
      <SettingSection title="Help & Support">
        <SettingItem
          icon="mail"
          label="Contact Support"
          onPress={() => openEmail('support@gozipmarket.com', 'Support Request - ZipService')}
        />
        <SettingItem
          icon="briefcase"
          label="Business Inquiries"
          onPress={() => openEmail('business@gozipmarket.com', 'Business Inquiry - ZipService')}
        />
        <SettingItem
          icon="information-circle-outline"
          label="General Information"
          onPress={() => openEmail('info@gozipmarket.com', 'Information Request - ZipService')}
        />
        <SettingItem
          icon="bug-outline"
          label="Report a Bug"
          onPress={() => openEmail('support@gozipmarket.com', 'Bug Report - ZipService')}
        />
        <SettingItem
          icon="help-circle-outline"
          label="FAQ"
          onPress={() => {
            Alert.alert('Coming Soon', 'FAQ section will be available soon!');
          }}
        />
      </SettingSection>

      {/* Legal */}
      <SettingSection title="Legal">
        <SettingItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => {
            // Open terms of service
            Alert.alert('Coming Soon', 'Terms of Service will be available soon!');
          }}
        />
        <SettingItem
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => {
            // Open privacy policy
            Alert.alert('Coming Soon', 'Privacy Policy will be available soon!');
          }}
        />
      </SettingSection>

      {/* About */}
      <SettingSection title="About">
        <SettingItem
          icon="information-outline"
          label="App Version"
          showArrow={false}
          rightComponent={<Text style={styles.versionText}>1.0.0</Text>}
        />
        <SettingItem
          icon="logo-github"
          label="Open Source Licenses"
          onPress={() => {
            Alert.alert('Coming Soon', 'License information will be available soon!');
          }}
        />
      </SettingSection>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 ZipService - Zip Market LLC</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  userInfo: {
    marginTop: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});