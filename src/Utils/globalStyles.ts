import { Platform, StyleSheet } from 'react-native';

export const createResponsiveStyles = (baseStyles: any) => {
  const responsiveStyles = { ...baseStyles };
  
  const containerNames = [
    'contentContainer',
    'scrollContent', 
    'scrollContainer',
    'content',
    'listContainer',
    'formContainer',
    'messageContainer',
    'emptyContainer',
    'container'
  ];
  
  containerNames.forEach(name => {
    if (responsiveStyles[name]) {
      responsiveStyles[name] = {
        ...responsiveStyles[name],
        ...(Platform.OS === 'web' && {
          maxWidth: 600,
          alignSelf: 'center',
          width: '100%',
          backgroundColor: '#ffffff',      // White background
          borderWidth: 1,                  // Border width
          borderColor: '#4A90E2',          // Blue border
          shadowColor: '#000',              // Subtle shadow
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          borderRadius: 12,                 // Rounded corners
          padding: 20,                      // Internal padding
        }),
      };
    }
  });
  
  return StyleSheet.create(responsiveStyles);
};