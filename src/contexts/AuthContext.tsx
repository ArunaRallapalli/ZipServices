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
 * - Restores auth state on app launch
 * - Exposes helper methods for login, logout, refresh, and auth checks
 * AuthContext is a shared place that stores login details (who the user is, whether they're logged in,
 *  and their token) so every screen can access them. 
 * AuthProvider is the manager that handles login and logout updates 
 * and shares this information with all screens.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from "../Utils/Alert";
import { useFocusEffect } from '@react-navigation/native';
import { store } from '../store/store';
import { clearCart } from '../store/cartSlice';
import { clearCheckout } from '../store/checkoutSlice';
/* ------------------------------------------------------------------
 * USER INFO TYPE
 * ------------------------------------------------------------------
 * Represents additional user profile data stored locally.
 * Some fields are optional because they may not be available at login.
 */
interface UserInfo {
  user_id: number;
  user_type?: 'customer' | 'business_owner';
  is_admin?: boolean;
  is_premium?: boolean;
  full_name?: string;
  phone_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  email?: string;
}
/* ------------------------------------------------------------------
 * AUTH STATE TYPE
 * ------------------------------------------------------------------
 * Represents the full authentication state of the app.
 */
interface AuthState {
  isAuthenticated: boolean;
  userToken: string | null;
  userType: string | null;
  userId: number | null;
  userInfo: UserInfo | null;
  loading: boolean;
  initialized: boolean; // New flag to track if auth has been initialized
  is_admin?: boolean; // Optional flag for admin status
}
/* ------------------------------------------------------------------
 * AUTH CONTEXT TYPE
 * ------------------------------------------------------------------
 * Extends AuthState with functions exposed to the app.
 */
interface AuthContextType extends AuthState {
  checkAuthStatus: (showDebug?: boolean) => Promise<{ isAuthenticated: boolean; userInfo: UserInfo | null }>;
  signIn: (token: string, userType: string, userId: number, email?: string, userInfo?: UserInfo) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuthWithPrompt: (navigation?: any) => Promise<boolean>;
}
/* ------------------------------------------------------------------
 * CREATE CONTEXT
 * ------------------------------------------------------------------
 * Initialized with null so we can enforce provider usage.
 */


const AuthContext = createContext<AuthContextType | null>(null);

/* ------------------------------------------------------------------
 * useAuth HOOK
 * ------------------------------------------------------------------
 * Custom hook to safely access AuthContext.
 * Throws an error if used outside AuthProvider.
 */

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
/* ------------------------------------------------------------------
 * PROVIDER PROPS
 * ------------------------------------------------------------------
 */

interface AuthProviderProps {
  children: React.ReactNode;
}
/* ------------------------------------------------------------------
 * AUTH PROVIDER COMPONENT
 * ------------------------------------------------------------------
 * Wraps the app and provides authentication state + helpers.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
/* --------------------------------------------------------------
   * AUTH STATE INITIALIZATION
   * --------------------------------------------------------------
   */

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userToken: null,
    userType: null,
    userId: null,
    userInfo: null,
    loading: true,
    initialized: false
  });
   /* --------------------------------------------------------------
   * checkAuthStatus
   * --------------------------------------------------------------
   * Reads auth data from AsyncStorage and reconstructs auth state.
   * Used:
   * - On app launch
   * - On screen focus
   * - Before protected actions
   */

  const checkAuthStatus = useCallback(async (showDebug = false) => {
  try {
    // ✅ FIX: Use 'access_token' instead of 'userToken'
    const [token, userType, userId, userEmail, storedUserInfo] = await Promise.all([
      AsyncStorage.getItem("access_token"),  // ← CHANGED
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

    // User is authenticated only if all required values exist
    const isAuthenticated = !!(token && userType && userId);
    let userInfo: UserInfo | null = null;

    if (isAuthenticated) {
      // Attempt to restore stored userInfo
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
      
      // Fallback: create minimal userInfo if none exists
      if (!userInfo && userId) {
        userInfo = {
          user_id: parseInt(userId),
          user_type: userType as 'customer' | 'business_owner',
          email: userEmail || undefined,
          is_admin: false,
          is_premium: false,
        };
      }
    }

    // Build new auth state
    const newAuthState = {
      isAuthenticated,
      userToken: token,
      userType,
      userId: userId ? parseInt(userId) : null,
      userInfo,
      loading: false,
      initialized: true
    };

    // Update context state
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
}, []);
  /* --------------------------------------------------------------
   * signIn
   * --------------------------------------------------------------
   * Saves auth data to AsyncStorage and updates context state.
   */
const signIn = useCallback(async (
  token: string,
  userType: string,
  userId: number,
  email?: string,
  userInfo?: UserInfo
) => {
  try {
    // ✅ FIX: Use 'access_token' instead of 'userToken'
    const authData: [string, string][] = [
      ['access_token', token],  // ← CHANGED
      ['userType', userType],
      ['userId', userId.toString()],
      ['userEmail', email || ''],
    ];

    // Ensure userInfo has the correct user_id
    const finalUserInfo = userInfo ? { ...userInfo, user_id: userId } : {
      user_id: userId,
      user_type: userType as 'customer' | 'business_owner',
      email,
      is_premium: false,
    };

    authData.push(['userInfo', JSON.stringify(finalUserInfo)]);

    // Clear cart from any previous user session
    store.dispatch(clearCart());
    store.dispatch(clearCheckout());

    // Persist to storage
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
  
  /* --------------------------------------------------------------
   * signOut
   * --------------------------------------------------------------
   * Clears all auth data from storage and resets state.
   */

  const signOut = useCallback(async () => {
  try {
    // Clear cart on logout so it doesn't persist to the next user
    store.dispatch(clearCart());
    store.dispatch(clearCheckout());

    await AsyncStorage.multiRemove([
      'access_token',
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
  /* --------------------------------------------------------------
   * refreshAuth
   * --------------------------------------------------------------
   * Re-checks auth state (used on screen focus).
   */

  const refreshAuth = useCallback(async () => {
    console.log('🔄 Screen focused, refreshing auth status');
    await checkAuthStatus(true);
  }, [checkAuthStatus]);

/* --------------------------------------------------------------
   * checkAuthWithPrompt
   * --------------------------------------------------------------
   * Checks auth and prompts user to sign in if not authenticated.
   */
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

 /* --------------------------------------------------------------
   * INITIAL AUTH CHECK (ONCE)
   * --------------------------------------------------------------
   */
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
  }, []); 
  /* --------------------------------------------------------------
   * TOKEN MIGRATION (CLEANUP OLD TOKEN KEY)
   * --------------------------------------------------------------
   */
  useEffect(() => {
    const migrateOldTokens = async () => {
      try {
        // Check if we have old token key
        const oldToken = await AsyncStorage.getItem('userToken');
        const newToken = await AsyncStorage.getItem('access_token');
        
        if (oldToken && !newToken) {
          // Migrate old token to new key
          console.log('🔄 Migrating old token to new key...');
          await AsyncStorage.setItem('access_token', oldToken);
          await AsyncStorage.removeItem('userToken');
          console.log('✅ Token migration complete');
        }
        
        // Log current state
        const currentToken = await AsyncStorage.getItem('access_token');
        console.log('🔑 Current token status:', {
          hasToken: !!currentToken,
          tokenPreview: currentToken?.substring(0, 30) + '...'
        });
      } catch (error) {
        console.error('❌ Token migration error:', error);
      }
    };
    
    migrateOldTokens();
  }, []);
  /* --------------------------------------------------------------
 * SESSION EXPIRATION DETECTION
 * --------------------------------------------------------------
 * Checks if token was cleared (expired) and redirects to login
 */
// Auto-logout poll removed — tokens are 7 days with silent refresh.
// Logout only happens explicitly via the Settings screen.
  /* --------------------------------------------------------------
   * MEMOIZED CONTEXT VALUE
   * --------------------------------------------------------------
   * Prevents unnecessary re-renders across the app.
   */
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
  /* --------------------------------------------------------------
   * PROVIDER RENDER
   * --------------------------------------------------------------
   */

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/* ------------------------------------------------------------------
 * useAuthFocus HOOK
 * ------------------------------------------------------------------
 * Automatically refreshes auth state whenever a screen gains focus.
 */
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