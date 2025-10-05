/**
 * AuthGuard
 * ---------
 * Higher-order component that protects screens requiring authentication.
 * - Checks for stored token/user info on mount and whenever the screen is focused.
 * - Optionally validates the token (extendable to API/JWT checks).
 * - If unauthenticated:
 *     • Shows an alert (if enabled) prompting the user to sign in, or
 *     • Navigates to a fallback screen directly.
 * - Displays a loading spinner while checking and renders children only when
 *   authentication requirements are satisfied.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackScreen?: string;
  requireAuth?: boolean; // Optional: allows guest access for some screens
  showAlert?: boolean; // Show alert when authentication fails
}

/**
 * Enhanced AuthGuard - Component that protects screens requiring authentication
 * 
 * This component checks if the user is authenticated before rendering its children.
 * Includes token validation, refresh on screen focus, and user-friendly alerts.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallbackScreen = 'ZipserviceHomeScreenSelection',
  requireAuth = true,
  showAlert = true
}) => {
  const navigation = useNavigation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status when component mounts
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Re-check auth status when screen comes into focus
  // This ensures fresh auth check after sign in/out
  useFocusEffect(
    React.useCallback(() => {
      checkAuthStatus();
    }, [])
  );

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      // Add your token validation logic here
      // This could be an API call to verify the token is still valid
      // For now, we'll just check if it exists and has proper format
      
      if (!token || token.trim() === '') {
        return false;
      }

      // Optional: Add JWT validation or API call here
      // const response = await fetch('/api/validate-token', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // return response.ok;

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      const [token, userType, userId] = await Promise.all([
        AsyncStorage.getItem('userToken'),
        AsyncStorage.getItem('userType'),
        AsyncStorage.getItem('userId')
      ]);

      console.log('Auth Check - Token:', token ? 'Present' : 'Missing');
      console.log('Auth Check - UserType:', userType);
      console.log('Auth Check - UserId:', userId);

      if (token && userType) {
        // Validate the token
        const isValidToken = await validateToken(token);
        
        if (isValidToken) {
          setIsAuthenticated(true);
          console.log('✅ User is authenticated');
        } else {
          console.log('❌ Invalid token, clearing storage');
          await clearAuthData();
          setIsAuthenticated(false);
          handleAuthFailure('Invalid session. Please sign in again.');
        }
      } else {
        console.log('❌ Missing auth data');
        setIsAuthenticated(false);
        if (requireAuth) {
          handleAuthFailure('Please sign in to continue.');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      if (requireAuth) {
        handleAuthFailure('Authentication error. Please try signing in again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'userToken',
        'userType', 
        'userId',
        'userEmail',
        'userInfo'
      ]);
      console.log('🧹 Cleared all auth data');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const handleAuthFailure = (message: string) => {
    if (showAlert) {
      Alert.alert(
        'Authentication Required',
        message,
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate(fallbackScreen as never),
            style: 'default'
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              // Allow user to stay on current screen if auth not required
              if (!requireAuth) {
                setIsAuthenticated(false);
              }
            }
          }
        ],
        { cancelable: !requireAuth }
      );
    } else {
      // Redirect immediately without alert
      navigation.navigate(fallbackScreen as never);
    }
  };

  // Force re-check auth status (useful for manual refresh)
  const refreshAuth = () => {
    checkAuthStatus();
  };

  // Show loading while checking authentication
  if (isLoading || isAuthenticated === null) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return null; // Alert/navigation will handle the redirect
  }

  // Render children if authenticated or auth not required
  return <>{children}</>;
};

export default AuthGuard;