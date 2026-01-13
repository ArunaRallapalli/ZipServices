/**
 * UserContext
 * -----------
 * Centralizes management of the current user’s profile and session data.
 * - Persists user info (id, name, email, etc.) to AsyncStorage.
 * - Exposes `useUser()` hook for reading/updating user data across the app.
 * - Provides `setUser` to update or clear the stored user and `logout` to sign out.
 * - Automatically loads any saved user on app start and normalizes `user_id` to a number.
 */


// contexts/UserContext.tsx - Improved version with better type handling
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserData {
  id?: string;
  user_id: number; // Make this required and always a number
  name: string;
  email: string;
  token?: string;
  phone_number?: string;
  zip_code?: string;
  user_type?: 'customer' | 'business_owner';
  full_name?: string;
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  isLoggedIn: boolean;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@zipservice_user';

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data from AsyncStorage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Ensure user_id is always a number
        if (parsedUser.user_id && typeof parsedUser.user_id === 'string') {
          parsedUser.user_id = parseInt(parsedUser.user_id, 10);
        }
        setUserState(parsedUser);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setLoading(false);
    }
  };

  const setUser = async (userData: UserData | null) => {
    try {
      if (userData) {
        // Ensure user_id is always a number before storing
        const normalizedUserData = {
          ...userData,
          user_id: typeof userData.user_id === 'string' 
            ? parseInt(userData.user_id, 10) 
            : userData.user_id
        };
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUserData));
        setUserState(normalizedUserData);
      } else {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        setUserState(null);
      }
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@zipservice_user');
      // 3. Clear user state
      setUserState(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value = {
    user,
    setUser,
    isLoggedIn: !!user,
    logout,
    loading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};