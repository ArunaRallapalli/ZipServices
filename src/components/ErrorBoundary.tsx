/**
 * ============================================================================
 * ErrorBoundary Component - Global Error Handler
 * ============================================================================
 * 
 * PURPOSE:
 * Prevents the entire app from crashing with a blank white screen when
 * React encounters an error during rendering, lifecycle methods, or constructors.
 * 
 * WHAT IT DOES:
 * - Catches JavaScript errors anywhere in the component tree
 * - Shows a friendly error message instead of blank screen
 * - Logs error details to console for debugging
 * - Prevents cascading failures that crash the entire app
 * 
 * USAGE:
 * Wrap your entire app in App.tsx:
 * 
 * ```typescript
 * import ErrorBoundary from './components/ErrorBoundary';
 * 
 * export default function App() {
 *   return (
 *     <ErrorBoundary>
 *       <NavigationContainer>
 *         <MainStackNavigator />
 *       </NavigationContainer>
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 * 
 * WHEN IT TRIGGERS:
 * - Component rendering errors (undefined variables, null reference)
 * - API call failures that aren't caught in try-catch
 * - State updates on unmounted components
 * - Any unhandled JavaScript exception in React components
 * 
 * WHEN IT DOESN'T TRIGGER:
 * - Errors inside event handlers (onClick, onPress) - must use try-catch
 * - Async code (Promises, setTimeout) - must use try-catch
 * - Server-side rendering errors
 * - Errors in the error boundary itself
 * 
 * PRODUCTION BENEFITS:
 * - Users see helpful message instead of blank screen
 * - App remains somewhat functional instead of completely dead
 * - Errors are logged for debugging
 * 
 * Last Updated: February 3, 2026
 * ============================================================================
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error Boundary Component
 * 
 * This is a React class component (not a functional component) because
 * error boundaries must be class components - it's a React requirement.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Called when an error is thrown in a child component
   * Updates state to show error UI
   */
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  /**
   * Called after an error is caught
   * Used for error logging and reporting
   */
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ React Error Caught by ErrorBoundary:', error, errorInfo);
    
    // TODO: In production, you could send this to an error reporting service:
    // - Sentry
    // - Bugsnag
    // - Firebase Crashlytics
    // Example: Sentry.captureException(error);
  }

  render() {
    // If there's an error, show friendly fallback UI
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error.{'\n'}
            Please restart the app to continue.
          </Text>
        </View>
      );
    }

    // No error - render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ErrorBoundary;