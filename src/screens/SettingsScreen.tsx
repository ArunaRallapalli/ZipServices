import React, { useState } from 'react';  // ✅ Removed useEffect
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  // No Alert here!
  Switch,
  Linking,
  SafeAreaView,
} from 'react-native';

import { Alert } from '../Utils/Alert';  // ✅ Only this one!
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/MainStackNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { userInfo, signOut } = useAuth();  // ✅ Get user data from context
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // ✅ NO userData state
  // ✅ NO useEffect
  // ✅ NO loadUserData function

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
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'BusinessOwnerHomeScreen' }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ... rest of your code
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          {userInfo && (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userInfo.full_name || 'User'}</Text>
              <Text style={styles.userEmail}>{userInfo.email}</Text>
            </View>
          )}
        </View>

        {/* Account Settings */}
        <SettingSection title="Account">
          <SettingItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => {
              // Navigate to Business Owner Profile
              navigation.navigate('BusinessOwnerProfileScreen', { user_id: userInfo?.user_id } as any);
            }}
          />
          <SettingItem
            icon="key-outline"
            label="Change Password"
            onPress={() => {
              Alert.alert('Coming Soon', 'Password change will be available soon!');
            }}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Privacy"
            onPress={() => {
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
            onPress={() => openEmail('zipmarket333@gmail.com', 'Support Request - GoZipMarket')}
          />
          <SettingItem
            icon="briefcase"
            label="Business Inquiries"
            onPress={() => openEmail('zipmarket333@gmail.com', 'Business Inquiry - GoZipMarket')}
          />
          <SettingItem
            icon="information-circle-outline"
            label="General Information"
            onPress={() => openEmail('zipmarket333@gmail.com', 'Information Request - GoZipMarket')}
          />
          <SettingItem
            icon="bug-outline"
            label="Report a Bug"
            onPress={() => openEmail('zipmarket333@gmail.com', 'Bug Report - GoZipMarket')}
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
              navigation.navigate('TermsOfService');
            }}
          />
          <SettingItem
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => {
              navigation.navigate('PrivacyPolicy');
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
          <Text style={styles.footerText}>© 2025 GoZipMarket - Zip Market LLC</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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