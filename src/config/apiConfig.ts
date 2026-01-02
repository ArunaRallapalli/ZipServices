import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Configuration
 */
const DEV_PORT = 5000;
const DEV_LAN_IP = "192.168.4.48";  // Your computer's LAN IP
const PROD_URL = "https://your-app-api.herokuapp.com"; // Production URL

/**
 * More reliable device detection for iOS
 */
const isPhysicalDevice = (() => {
  // For iOS, check multiple indicators
  if (Platform.OS === "ios") {
    // Use the non-deprecated expoConfig API
    const debuggerHost = Constants.expoConfig?.hostUri;
    
    // If debuggerHost contains an IP address (not localhost), it's a physical device
    if (debuggerHost && !debuggerHost.includes('localhost') && !debuggerHost.includes('127.0.0.1')) {
      return true;
    }
    
    // Fallback to Constants.isDevice
    return Boolean(Constants.isDevice);
  }
  
  // For Android, Constants.isDevice is more reliable
  return Boolean(Constants.isDevice);
})();

/**
 * Determine API base URL based on environment and platform
 */
const API_URL = (() => {
  // Production build
  if (!__DEV__) {
    return PROD_URL;
  }

  // Development - determine URL based on platform and device type
  const platform = Platform.OS;

  // ✅ WEB PLATFORM - Must use localhost
  if (platform === "web") {
    console.log("→ Web browser: using localhost");
    return `http://localhost:${DEV_PORT}`;
  }

  if (platform === "ios") {
    if (isPhysicalDevice) {
      console.log("→ iOS physical device: using LAN IP");
      return `http://${DEV_LAN_IP}:${DEV_PORT}`;
    } else {
      console.log("→ iOS simulator: using localhost");
      return `http://localhost:${DEV_PORT}`;
    }
  }

  if (platform === "android") {
    if (isPhysicalDevice) {
      console.log("→ Android physical device: using LAN IP");
      return `http://${DEV_LAN_IP}:${DEV_PORT}`;
    } else {
      console.log("→ Android emulator: using 10.0.2.2");
      return `http://10.0.2.2:${DEV_PORT}`;
    }
  }

  // Fallback for unknown platforms - use localhost
  console.log("→ Unknown platform: using localhost");
  return `http://localhost:${DEV_PORT}`;
})();

// Enhanced logging for debugging
console.log("🔧 API Configuration", {
  Environment: __DEV__ ? "Development" : "Production",
  Platform: Platform.OS,
  IsPhysicalDevice: isPhysicalDevice,
  ConstantsIsDevice: Constants.isDevice,
  DebuggerHost: Constants.expoConfig?.hostUri,
  API_URL,
});

export default API_URL;