/**
 * PostLandingScreen Component
 * 
 * Landing page with two options:
 * 1. Post a Service - Navigate to PostServiceScreen
 * 2. Request New Service Category - Navigate to RequestServiceCategoryScreen
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { createResponsiveStyles } from '../Utils/globalStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const PostLandingScreen: React.FC = () => {
  const navigation = useNavigation();

  const navigateToPostService = () => {
    navigation.navigate('PostServiceScreen' as never);
  };

  const navigateToRequestCategory = () => {
    navigation.navigate('RequestServiceCategoryScreen' as never);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleGoBack}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>What would you like to do?</Text>
        <Text style={styles.headerSubtitle}>Choose an option below</Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* Option 1: Post a Service */}
        <TouchableOpacity
          style={styles.optionColumn}
          onPress={navigateToPostService}
          activeOpacity={0.7}
        >
          <View style={[styles.descriptionBox, styles.primaryBox]}>
            <Ionicons name="briefcase" size={40} color="#4A90E2" />
            <Text style={styles.descriptionTitle}>Post a Service</Text>
            <Text style={styles.descriptionText}>
              Offer your services for others who need it in your area
            </Text>
            <View style={[styles.badge, styles.primaryBadge]}>
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.badgeText}>Post/Offer Service</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Option 2: Request New Category */}
        <TouchableOpacity
          style={styles.optionColumn}
          onPress={navigateToRequestCategory}
          activeOpacity={0.7}
        >
          <View style={[styles.descriptionBox, styles.secondaryBox]}>
            <Ionicons name="add-circle" size={40} color="#4CAF50" />
            <Text style={styles.descriptionTitle}>Request new Category</Text>
            <Text style={styles.descriptionText}>
              Don't see your category? Request a new one
            </Text>
            <View style={[styles.badge, styles.secondaryBadge]}>
              <Ionicons name="paper-plane" size={16} color="#fff" />
              <Text style={styles.badgeText}>Request Category</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <Text style={styles.infoText}>
          Post your services or request new categories to be added
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = createResponsiveStyles({ 
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  header: {
    padding: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  optionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  optionColumn: {
    flex: 1,
  },
  descriptionBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBox: {
    borderColor: '#4A90E2',
  },
  secondaryBox: {
    borderColor: '#4CAF50',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  primaryBadge: {
    backgroundColor: '#4A90E2',
  },
  secondaryBadge: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginTop: 10,
    padding: 12,
    backgroundColor: '#E8F4F8',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});

export default PostLandingScreen;