/**
 * AuthContext / useAuth Hook
 * --------------------------
 * Full authentication state manager.
 * - Tracks token, user type, user ID, and optional profile details.
 * - Persists and restores auth data with AsyncStorage.
 * - Exposes `useAuth()` hook with methods:
 *     • checkAuthStatus: validate and refresh auth state.
 *     • signIn / signOut: handle login/logout flows with storage updates and alerts.
 *     • refreshAuth / checkAuthWithPrompt: refresh on demand or prompt user to sign in.
 * - `useAuthFocus` helper refreshes auth each time a screen gains focus.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface UserInfo {
  user_id: number;
  user_type?: 'customer' | 'business_owner';
  full_name?: string;
  phone_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  email?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  userToken: string | null;
  userType: string | null;
  userId: number | null;
  userInfo: UserInfo | null;
  loading: boolean;
  initialized: boolean; // New flag to track if auth has been initialized
}

interface AuthContextType extends AuthState {
  checkAuthStatus: (showDebug?: boolean) => Promise<{ isAuthenticated: boolean; userInfo: UserInfo | null }>;
  signIn: (token: string, userType: string, userId: number, email?: string, userInfo?: UserInfo) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuthWithPrompt: (navigation?: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userToken: null,
    userType: null,
    userId: null,
    userInfo: null,
    loading: true,
    initialized: false
  });

  const checkAuthStatus = useCallback(async (showDebug = false) => {
    try {
      const [token, userType, userId, userEmail, storedUserInfo] = await Promise.all([
        AsyncStorage.getItem("userToken"),
        AsyncStorage.getItem("userType"),
        AsyncStorage.getItem("userId"),
        AsyncStorage.getItem("userEmail"),
        AsyncStorage.getItem("userInfo")
      ]);

      if (showDebug) {
        console.log("🔍 Auth Context Check:", {
          hasToken: !!token,
          userType,
          userId: userId || 'null',
          hasStoredInfo: !!storedUserInfo,
          timestamp: new Date().toISOString()
        });
      }

      const isAuthenticated = !!(token && userType && userId);
      let userInfo: UserInfo | null = null;

      if (isAuthenticated) {
        if (storedUserInfo) {
          try {
            userInfo = JSON.parse(storedUserInfo);
            // Ensure user_id is properly set as a number
            if (userInfo && userId) {
              userInfo.user_id = parseInt(userId);
            }
          } catch (parseError) {
            console.error("Error parsing stored user info:", parseError);
          }
        }
        
        // Always ensure we have at least basic user info if authenticated
        if (!userInfo && userId) {
          userInfo = {
            user_id: parseInt(userId),
            user_type: userType as 'customer' | 'business_owner',
            email: userEmail || undefined,
          };
        }
      }

      const newAuthState = {
        isAuthenticated,
        userToken: token,
        userType,
        userId: userId ? parseInt(userId) : null,
        userInfo,
        loading: false,
        initialized: true
      };

      setAuthState(newAuthState);

      if (showDebug) {
        console.log("✅ Auth state updated:", {
          isAuthenticated,
          hasUserInfo: !!userInfo,
          userId: userInfo?.user_id || 'null',
          userType: userInfo?.user_type || 'null'
        });
      }

      return { isAuthenticated, userInfo };
    } catch (error) {
      console.error("Error checking auth status:", error);
      const errorState = {
        isAuthenticated: false,
        userToken: null,
        userType: null,
        userId: null,
        userInfo: null,
        loading: false,
        initialized: true
      };
      setAuthState(errorState);
      return { isAuthenticated: false, userInfo: null };
    }
  }, []); // Empty dependency array - this function reads fresh data from AsyncStorage

  const signIn = useCallback(async (
    token: string,
    userType: string,
    userId: number,
    email?: string,
    userInfo?: UserInfo
  ) => {
    try {
      const authData: [string, string][] = [
        ['userToken', token],
        ['userType', userType],
        ['userId', userId.toString()],
        ['userEmail', email || ''],
      ];

      // Ensure userInfo has the correct user_id
      const finalUserInfo = userInfo ? { ...userInfo, user_id: userId } : {
        user_id: userId,
        user_type: userType as 'customer' | 'business_owner',
        email
      };

      authData.push(['userInfo', JSON.stringify(finalUserInfo)]);

      await AsyncStorage.multiSet(authData);

      const newAuthState = {
        isAuthenticated: true,
        userToken: token,
        userType,
        userId,
        userInfo: finalUserInfo,
        loading: false,
        initialized: true
      };

      setAuthState(newAuthState);

      console.log('✅ User signed in successfully:', {
        hasToken: !!token,
        hasUserInfo: !!finalUserInfo,
        userId: finalUserInfo.user_id.toString(),
        userType: finalUserInfo.user_type
      });

      Alert.alert(
        'Welcome!',
        'You have been signed in successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error signing in:', error);
      Alert.alert(
        'Sign In Error',
        'Failed to save sign in information. Please try again.',
        [{ text: 'OK' }]
      );
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        'userToken',
        'userType',
        'userId',
        'userEmail',
        'userInfo'
      ]);

      setAuthState({
        isAuthenticated: false,
        userToken: null,
        userType: null,
        userId: null,
        userInfo: null,
        loading: false,
        initialized: true
      });

      console.log('✅ User signed out successfully');

      Alert.alert(
        'Signed Out',
        'You have been signed out successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert(
        'Sign Out Error',
        'There was an error signing out. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    console.log('🔄 Screen focused, refreshing auth status');
    await checkAuthStatus(true);
  }, [checkAuthStatus]);

  const checkAuthWithPrompt = useCallback(async (navigation?: any): Promise<boolean> => {
    const { isAuthenticated } = await checkAuthStatus();
    
    if (!isAuthenticated) {
      return new Promise((resolve) => {
        Alert.alert(
          'Sign In Required',
          'You need to be signed in to use this feature. Would you like to sign in now?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Sign In',
              onPress: () => {
                if (navigation) {
                  navigation.navigate('BusinessOwnerHomeScreen');
                }
                resolve(false);
              }
            }
          ]
        );
      });
    }
    
    return true;
  }, [checkAuthStatus]);

  // Check auth status on mount - ONLY ONCE
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      console.log('🚀 Initializing AuthContext...');
      if (mounted) {
        await checkAuthStatus(true);
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to run only on mount

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<AuthContextType>(() => ({
    ...authState,
    checkAuthStatus,
    signIn,
    signOut,
    refreshAuth,
    checkAuthWithPrompt
  }), [
    authState,
    checkAuthStatus,
    signIn,
    signOut,
    refreshAuth,
    checkAuthWithPrompt
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for screens that need to refresh auth on focus
export const useAuthFocus = () => {
  const auth = useAuth();
  
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if auth is already initialized to avoid unnecessary calls
      if (auth.initialized) {
        auth.refreshAuth();
      }
    }, [auth.refreshAuth, auth.initialized])
  );
  
  return auth;
};