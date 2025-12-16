import { Alert as RNAlert, Platform } from 'react-native';

// Global state for web modal
let webAlertCallback: ((config: any) => void) | null = null;

export const setWebAlertHandler = (handler: (config: any) => void) => {
  console.log('🎯 setWebAlertHandler called - handler registered');
  webAlertCallback = handler;
};

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: any[],
    options?: any
  ) => {
    console.log('🔔 Alert.alert called:', { title, platform: Platform.OS });
    
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform detected');
      console.log('📞 webAlertCallback exists?', !!webAlertCallback);
      
      if (webAlertCallback) {
        console.log('✅ Calling webAlertCallback with config:', { title, message, buttons });
        webAlertCallback({ 
          title, 
          message, 
          buttons: buttons || [{ text: 'OK' }] 
        });
      } else {
        console.log('❌ No webAlertCallback - using fallback alert()');
        const fullMessage = message ? `${title}\n\n${message}` : title;
        alert(fullMessage);
      }
    } else {
      console.log('📱 Mobile platform - using native Alert');
      RNAlert.alert(title, message, buttons, options);
    }
  }
};