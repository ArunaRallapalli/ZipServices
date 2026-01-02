/**
 * VerifyEmailScreen Component
 * 
 * Handles email verification when user clicks link from email
 * Accessed via: /verify-email?token=xxx&email=xxx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import API_URL from '../config/apiConfig';
import { createResponsiveStyles } from '../Utils/globalStyles';
import { Alert } from '../Utils/Alert';

const VerifyEmailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Extract token and email from URL parameters
  const params = route.params as { token?: string; email?: string } | undefined;
  const [token, setToken] = useState(params?.token || '');
  const [email, setEmail] = useState(params?.email || '');

  // Verification state
  const [verifying, setVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Parse URL parameters on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlEmail = urlParams.get('email');
      
      if (urlToken) setToken(urlToken);
      if (urlEmail) setEmail(decodeURIComponent(urlEmail));
    }
  }, []);

  // Auto-verify when component mounts
  useEffect(() => {
    if (token && email) {
      handleVerifyEmail();
    } else {
      setVerifying(false);
      setVerificationStatus('error');
      setErrorMessage('Invalid verification link. Missing token or email.');
    }
  }, [token, email]);

  /**
   * Handle email verification
   */
  const handleVerifyEmail = async () => {
    setVerifying(true);
    setVerificationStatus('loading');

    try {
      const response = await fetch(`${API_URL}/api/email-verification/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.alreadyVerified) {
          setVerificationStatus('already-verified');
        } else {
          setVerificationStatus('success');
        }
      } else {
        setVerificationStatus('error');
        setErrorMessage(data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setVerifying(false);
    }
  };

  /**
   * Navigate to sign in
   */
  const handleGoToSignIn = () => {
    navigation.navigate('SigninBusinessOwners' as never);
  };

  /**
   * Request new verification email
   */
  const handleResendEmail = () => {
    Alert.alert(
      'Resend Verification Email',
      'Please sign in to request a new verification email.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Sign In', onPress: handleGoToSignIn }
      ]
    );
  };

  /**
   * Render content based on verification status
   */
  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.statusTitle}>Verifying Your Email...</Text>
            <Text style={styles.statusSubtitle}>Please wait a moment</Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Email Verified! 🎉</Text>
            <Text style={styles.statusSubtitle}>
              Your email has been successfully verified.
            </Text>
            <Text style={styles.statusText}>
              You can now sign in and access all features of ZipService.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoToSignIn}
            >
              <Ionicons name="log-in" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        );

      case 'already-verified':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle-outline" size={80} color="#2196F3" />
            </View>
            <Text style={styles.infoTitle}>Already Verified</Text>
            <Text style={styles.statusSubtitle}>
              This email has already been verified.
            </Text>
            <Text style={styles.statusText}>
              You can sign in to your account.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoToSignIn}
            >
              <Ionicons name="log-in" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={80} color="#ef4444" />
            </View>
            <Text style={styles.errorTitle}>Verification Failed</Text>
            <Text style={styles.statusSubtitle}>{errorMessage}</Text>
            
            <View style={styles.errorInfo}>
              <Text style={styles.errorInfoText}>Common reasons:</Text>
              <Text style={styles.errorInfoItem}>• Link has expired (valid for 24 hours)</Text>
              <Text style={styles.errorInfoItem}>• Link has already been used</Text>
              <Text style={styles.errorInfoItem}>• Invalid or corrupted link</Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleResendEmail}
            >
              <Ionicons name="mail" size={20} color="#4A90E2" />
              <Text style={styles.secondaryButtonText}>Request New Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
              onPress={handleGoToSignIn}
            >
              <Text style={styles.textButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="mail" size={64} color="#4A90E2" />
            <Text style={styles.title}>Email Verification</Text>
            {email && (
              <Text style={styles.emailText}>{email}</Text>
            )}
          </View>

          {/* Dynamic Content */}
          {renderContent()}
        </View>
      </View>
    </View>
  );
};

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 4,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorInfo: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 16,
    marginVertical: 20,
    borderRadius: 4,
    width: '100%',
  },
  errorInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorInfoItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  textButton: {
    paddingVertical: 12,
    marginTop: 12,
  },
  textButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default VerifyEmailScreen;