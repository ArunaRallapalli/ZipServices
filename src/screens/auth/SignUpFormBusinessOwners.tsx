/**
 * ============================================================================
 * SignUpFormBusinessOwners Component
 * ============================================================================
 * 
 * PURPOSE:
 * This is the primary registration form for new users in the ZipService app.
 * It provides a comprehensive sign-up experience with real-time validation,
 * intelligent auto-completion, and helpful error messaging to guide users
 * through the registration process smoothly.
 * 
 * CONTEXT:
 * Since the app now has only one user type (previously had separate business
 * owners and customers), this form has been simplified to collect essential
 * information without business-specific categorization. The form focuses on
 * gathering personal details, contact information, and location data needed
 * to create a complete user profile.
 * 
 * KEY FEATURES:
 * ============================================================================
 * 
 * 1. SMART ZIP CODE AUTO-POPULATION
 *    - Automatically fetches city and state from entered zip code
 *    - Uses free Zippopotam.us API (no authentication required)
 *    - Shows loading indicator during API call
 *    - Gracefully handles errors without blocking user input
 *    - Allows manual override of auto-populated values
 * 
 * 2. INTELLIGENT EMAIL ERROR HANDLING
 *    - Detects when user tries to register with existing email
 *    - Shows clear, actionable error message instead of generic failure
 *    - Suggests alternatives (use different email or try logging in)
 *    - Improves user experience and reduces confusion
 * 
 * 3. COMPREHENSIVE FORM VALIDATION
 *    - Email: Regex validation for proper format (user@domain.com)
 *    - Phone: 10-15 digit validation (optional field)
 *    - Password: Strong password requirements with multiple criteria
 *    - Required fields: All validated before submission
 * 
 * 4. REAL-TIME FORM STATE MANAGEMENT
 *    - Controlled components with React state
 *    - Immediate feedback on user input
 *    - Prevents uncontrolled component warnings
 * 
 * 5. USER EXPERIENCE ENHANCEMENTS
 *    - Auto-scroll to bottom when filling last field
 *    - Cancel button in top right for easy exit
 *    - Keyboard-optimized input types (phone-pad, email, numeric)
 *    - Loading states with visual feedback
 *    - User-friendly error alerts with clear messaging
 * 
 * FORM STRUCTURE:
 * ============================================================================
 * 
 * Required Fields (marked with *):
 * - Name: User's full name
 * - Email: Used for login and communication
 * - Password: Must meet security requirements
 * - Street: Street address
 * - City: City name (can be auto-populated from zip)
 * - State: State abbreviation (can be auto-populated from zip)
 * - Zip Code: 5-digit US postal code
 * 
 * Optional Fields:
 * - Description: Additional information about user or services
 * - Phone Number: Contact number (validated if provided)
 * - Service Radius: How far user travels for service (in miles)
 * 
 * VALIDATION RULES:
 * ============================================================================
 * 
 * Email Validation:
 * - Pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 * - Examples: john@example.com ✓, john@example ✗, @example.com ✗
 * 
 * Phone Validation (if provided):
 * - Strips non-numeric characters before validation
 * - Pattern: /^[0-9]{10,15}$/
 * - Examples: (555) 123-4567 ✓, 5551234567 ✓, 555-123 ✗
 * 
 * Password Validation:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*)
 * - Pattern: /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/
 * - Examples: Password123! ✓, password ✗, Password ✗
 * 
 * API INTEGRATION:
 * ============================================================================
 * 
 * 1. User Registration API:
 *    Endpoint: POST /business_owners/crud/register
 *    Purpose: Creates new user account in database
 *    Request Body: {
 *      name, description, phone_number, email, password,
 *      street, city, state, zip_code, service_radius_miles
 *    }
 *    Success Response: { success: true, ... }
 *    Error Response: { message: "Error description" }
 * 
 * 2. Zip Code Lookup API:
 *    Endpoint: GET http://api.zippopotam.us/us/{zipCode}
 *    Purpose: Fetches city and state from zip code
 *    Response: { places: [{ "place name": "City", "state abbreviation": "ST" }] }
 *    Free service, no authentication required
 * 
 * COMPONENT FLOW:
 * ============================================================================
 * 
 * 1. Component Mounts
 *    └─> Initializes empty form state
 *    └─> Sets up scroll reference for auto-scroll feature
 * 
 * 2. User Fills Form
 *    ├─> Each input updates corresponding form state field
 *    ├─> Zip code entry (5 digits) triggers city/state lookup
 *    │   ├─> Shows loading indicator
 *    │   ├─> Calls Zippopotam API
 *    │   ├─> Auto-populates city and state
 *    │   └─> Hides loading indicator
 *    └─> Service radius entry auto-scrolls to reveal submit button
 * 
 * 3. User Submits Form
 *    ├─> Validates all required fields are filled
 *    ├─> Validates email format
 *    ├─> Validates phone format (if provided)
 *    ├─> Validates password strength
 *    ├─> If validation fails: Shows specific error alert
 *    └─> If validation passes:
 *        ├─> Sends POST request to registration API
 *        ├─> On Success:
 *        │   ├─> Shows success alert
 *        │   └─> Navigates to BusinessOwnerHomeScreen
 *        └─> On Failure:
 *            ├─> If email exists: Shows specific email error
 *            └─> Otherwise: Shows generic error from backend
 * 
 * 4. User Clicks Cancel
 *    └─> Navigates back to BusinessOwnerHomeScreen without saving
 * 
 * ERROR HANDLING STRATEGY:
 * ============================================================================
 * 
 * 1. Validation Errors:
 *    - Show specific field-level alerts
 *    - Guide user to fix the exact issue
 *    - Prevent submission until resolved
 * 
 * 2. Network Errors:
 *    - Show generic connection error
 *    - Log detailed error for debugging
 *    - Allow retry
 * 
 * 3. Existing Email Error:
 *    - Detect from backend error message
 *    - Show clear, actionable message
 *    - Suggest using different email or logging in
 * 
 * 4. Zip Code Lookup Errors:
 *    - Fail silently (no alert shown)
 *    - Allow manual entry of city/state
 *    - Log error for debugging
 * 
 * ACCESSIBILITY CONSIDERATIONS:
 * ============================================================================
 * - Keyboard types optimized for each input (email, phone-pad, numeric)
 * - Clear placeholder text with * for required fields
 * - High contrast colors for readability
 * - Large touch targets for buttons
 * - Descriptive alerts for errors
 * - Visual feedback for loading states
 * 
 * FUTURE ENHANCEMENTS:
 * ============================================================================
 * - Add password strength meter with visual feedback
 * - Implement real-time validation with inline error messages
 * - Add confirmation for password field
 * - Support for international phone numbers and addresses
 * - Remember last entered data (with user consent)
 * - Add profile picture upload during registration
 * 
 * @component
 * @returns {JSX.Element} The registration form component
 */

// ============================================================================
// IMPORTS
// ============================================================================

// React core imports for component functionality
import React, { useState, useRef } from "react";

// React Native UI components for building the interface
import {
  View,          // Container component for layout
  Text,          // Text display component
  TextInput,     // Input field for user data entry
  TouchableOpacity, // Touchable button component
  Alert,         // Native alert dialog for user feedback
  ScrollView,    // Scrollable container for long forms
  StyleSheet,    // Styling system for components
  ActivityIndicator, // Loading spinner component
} from "react-native";

// React Navigation imports for screen transitions
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// App-specific imports
import { RootStackParamList } from "../../navigation/MainStackNavigator"; // Type definitions for navigation
import API_URL from "../../config/apiConfig"; // Base API URL configuration for backend calls

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Define the navigation prop type for type-safe navigation
// This ensures we can only navigate to screens that exist in our navigation stack
// and helps prevent runtime navigation errors
type SignUpBusinessNavProp = StackNavigationProp<
  RootStackParamList,
  "SignUpFormBusinessOwners"
>;

// ============================================================================
// MAIN COMPONENT DEFINITION
// ============================================================================

/**
 * SignUpFormBusinessOwners Component
 * 
 * This is the main functional component that renders the registration form.
 * It manages all form state, validation logic, API calls, and user interactions.
 * 
 * Component Architecture:
 * - Uses React Hooks for state management (useState)
 * - Uses refs for DOM manipulation (useRef for ScrollView)
 * - Implements controlled components pattern for all inputs
 * - Handles both synchronous validation and asynchronous API calls
 * 
 * @returns {JSX.Element} A complete registration form with validation and auto-completion
 */
const SignUpFormBusinessOwners = () => {
  // ============================================================================
  // HOOKS & INITIALIZATION
  // ============================================================================
  
  // Initialize navigation hook for screen transitions
  // This allows us to programmatically navigate between screens
  // Used for: navigating back to home screen after registration or cancellation
  const navigation = useNavigation<SignUpBusinessNavProp>();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Form Data State
   * Manages all input fields for the registration form
   * All fields start as empty strings to prevent uncontrolled component warnings
   * 
   * Simplified structure for single user type:
   * - Removed businessName (replaced with simple name field)
   * - Removed serviceCategory (no longer needed for single user type)
   */
  const [formData, setFormData] = useState({
    name: "",               // User's full name - Required
    description: "",         // Optional user/business description
    phoneNumber: "",         // Optional contact phone number
    email: "",              // Required - used for login
    password: "",           // Required - must meet strength requirements
    street: "",             // Required - street address
    city: "",               // Required - city name
    state: "",              // Required - state/province
    zipCode: "",            // Required - postal/zip code
    serviceRadiusMiles: "", // Optional - service area radius
  });

  /**
   * Zip Code Loading State
   * Tracks whether city/state data is being fetched from zip code API
   * Shows a small loading indicator next to zip code field during fetch
   */
  const [isLoadingZipData, setIsLoadingZipData] = useState(false);

  // ============================================================================
  // REFS
  // ============================================================================

  /**
   * ScrollView Reference
   * 
   * Purpose: Provides programmatic control over the ScrollView component
   * 
   * Use Cases:
   * 1. Auto-scroll to bottom when user fills the last input field (service radius)
   * 2. Ensures submit button is visible on smaller screens
   * 3. Improves user experience by preventing hidden controls
   * 
   * Implementation:
   * - Created with useRef<ScrollView>(null)
   * - Attached to ScrollView component via ref prop
   * - Called with scrollViewRef.current?.scrollToEnd({ animated: true })
   * - Optional chaining (?.) prevents errors if ref is not yet attached
   */
  const scrollViewRef = useRef<ScrollView>(null);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * handleChange
   * Generic handler for all form input changes
   * Updates the specific field in formData state while preserving other fields
   * 
   * @param field - The name of the form field to update (e.g., "name", "email")
   * @param value - The new value for the field (always string for text inputs)
   */
  const handleChange = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  /**
   * fetchCityStateFromZip
   * Automatically fetches city and state information based on entered zip code
   * Uses the free Zippopotam.us API which doesn't require authentication
   * 
   * API: http://api.zippopotam.us/us/{zipCode}
   * Response structure: {
   *   "country": "United States",
   *   "places": [{
   *     "place name": "Beverly Hills",
   *     "state": "California",
   *     "state abbreviation": "CA"
   *   }]
   * }
   * 
   * Process:
   * 1. Validate zip code is exactly 5 digits (US format)
   * 2. Set loading state to show user data is being fetched
   * 3. Make GET request to Zippopotam API
   * 4. Extract city name and state abbreviation from response
   * 5. Auto-populate city and state fields in form
   * 6. Handle errors gracefully without blocking user input
   * 
   * @param zipCode - The 5-digit US zip code entered by user
   * 
   * Error Handling:
   * - Invalid zip codes (not 5 digits) are silently ignored
   * - Network errors don't show alerts, allowing manual entry
   * - Invalid/non-existent zip codes don't show alerts
   * - User can always manually override auto-populated values
   */
  const fetchCityStateFromZip = async (zipCode: string) => {
    // Only proceed if zip code is exactly 5 digits (valid US zip code format)
    // This prevents unnecessary API calls for partial or invalid entries
    if (zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      return; // Exit silently for invalid format
    }

    try {
      // Set loading state to show small spinner next to zip field
      setIsLoadingZipData(true);
      console.log("📍 Fetching city/state for zip code:", zipCode);

      // Call free Zippopotam API for US zip code lookup
      // No API key required, returns city and state information
      const response = await fetch(`http://api.zippopotam.us/us/${zipCode}`);
      
      if (response.ok) {
        // Parse JSON response from API
        const data = await response.json();
        console.log("📍 Zip code data received:", data);

        // Extract city name and state abbreviation from first place in response
        // API returns array of places, we use the first one (primary location)
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place["place name"];           // e.g., "Beverly Hills"
          const state = place["state abbreviation"];  // e.g., "CA"

          // Auto-populate city and state fields in form
          // User can still manually change these if needed
          setFormData(prev => ({
            ...prev,
            city: city,
            state: state,
          }));

          console.log("✅ Auto-populated city:", city, "state:", state);
        }
      } else {
        // API returned error (e.g., 404 for invalid zip code)
        // Don't show alert - just log and let user enter manually
        console.log("❌ Zip code not found or invalid");
      }
    } catch (error) {
      // Network error or API unavailable
      // Fail silently to not interrupt user experience
      // User can still manually enter city and state
      console.error("❌ Error fetching zip code data:", error);
    } finally {
      // Always clear loading state when done (success or failure)
      setIsLoadingZipData(false);
    }
  };

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================
  
  /**
   * These regex-based validators ensure data quality before submission
   * Each returns true if valid, false if invalid
   * 
   * Why Regex Validation?
   * - Fast and efficient pattern matching
   * - Client-side validation reduces server load
   * - Immediate feedback to users
   * - Prevents malformed data from reaching backend
   * 
   * Note: These are frontend validations. Backend should also validate
   * for security (never trust client-side validation alone)
   */
  
  /**
   * isValidEmail
   * 
   * Purpose: Validates email format using regex pattern
   * Pattern Breakdown:
   * - ^[^\s@]+    : Start with one or more non-whitespace, non-@ characters
   * - @           : Must contain exactly one @ symbol
   * - [^\s@]+     : Followed by one or more non-whitespace, non-@ characters
   * - \.          : Must contain a dot (.)
   * - [^\s@]+$    : End with one or more non-whitespace, non-@ characters
   * 
   * This ensures: localpart@domain.extension structure
   * 
   * @param email - Email address to validate
   * @returns true if valid email format, false otherwise
   * 
   * Examples: 
   * - john@example.com ✓ (valid)
   * - user.name@company.co.uk ✓ (valid)
   * - john@example ✗ (missing domain extension)
   * - @example.com ✗ (missing local part)
   * - john.example.com ✗ (missing @)
   * - john @example.com ✗ (contains space)
   * 
   * Limitations:
   * - Doesn't validate if email actually exists
   * - Doesn't check all RFC 5322 specifications (simplified for usability)
   * - Backend should perform additional email verification
   */
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  /**
   * isValidPhone
   * 
   * Purpose: Validates phone number format
   * 
   * Process:
   * 1. Strips all non-numeric characters using replace(/\D/g, "")
   *    - Removes: spaces, parentheses, dashes, plus signs, etc.
   *    - Keeps: only digits 0-9
   * 2. Checks if resulting string is 10-15 digits long
   * 
   * Why 10-15 digits?
   * - 10 digits: Standard US phone number (area code + number)
   * - 15 digits: Maximum international phone number length per ITU-T E.164
   * 
   * @param phone - Phone number to validate (can include formatting)
   * @returns true if valid phone format, false otherwise
   * 
   * Examples: 
   * - (555) 123-4567 ✓ (formatted US)
   * - 555-123-4567 ✓ (formatted US)
   * - 5551234567 ✓ (unformatted US)
   * - +1-555-123-4567 ✓ (international format)
   * - +44 20 7123 4567 ✓ (UK format)
   * - 555-123 ✗ (too short - only 6 digits)
   * - 12345 ✗ (too short)
   * 
   * Note: This validation is only applied to optional phone field
   * Only validates if user enters a phone number
   */
  const isValidPhone = (phone: string) =>
    /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ""));
  
  /**
   * isStrongPassword
   * 
   * Purpose: Validates password strength requirements for security
   * 
   * Pattern Breakdown:
   * - ^              : Start of string
   * - (?=.*[A-Z])    : Positive lookahead - must contain at least one uppercase letter
   * - (?=.*[a-z])    : Positive lookahead - must contain at least one lowercase letter
   * - (?=.*[0-9])    : Positive lookahead - must contain at least one digit
   * - (?=.*[!@#$%^&*]): Positive lookahead - must contain at least one special character
   * - .{8,}          : Must be at least 8 characters long (any character type)
   * - $              : End of string
   * 
   * Why These Requirements?
   * - 8+ characters: Increases brute force attack difficulty exponentially
   * - Uppercase: Expands character set, makes dictionary attacks harder
   * - Lowercase: Standard letter requirement
   * - Number: Prevents purely alphabetic passwords
   * - Special char: Further expands character set, prevents common patterns
   * 
   * Security Best Practices:
   * - These are minimum requirements (consider stronger for production)
   * - Backend should hash passwords (never store plain text)
   * - Consider implementing password strength meter for user feedback
   * - Check against common password databases (Have I Been Pwned API)
   * 
   * @param password - Password to validate
   * @returns true if password meets all requirements, false otherwise
   * 
   * Examples: 
   * - Password123! ✓ (meets all requirements)
   * - MyP@ssw0rd ✓ (meets all requirements)
   * - Str0ng!Pass ✓ (meets all requirements)
   * - password ✗ (missing uppercase, number, special char)
   * - Password ✗ (missing number and special char)
   * - PASSWORD123! ✗ (missing lowercase)
   * - Pass1! ✗ (too short - only 6 characters)
   * - Password1234 ✗ (missing special character)
   * 
   * Common User Mistakes:
   * - Forgetting special character requirement
   * - Making password too short
   * - Using all lowercase
   * - Not mixing character types
   */
  const isStrongPassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(password);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * handleCancel
   * 
   * Purpose: Handles the Cancel button press in the top right corner
   * 
   * Behavior:
   * - Navigates user back to BusinessOwnerHomeScreen immediately
   * - Does NOT save any form data entered by user
   * - Does NOT show confirmation dialog (instant navigation)
   * - Provides quick escape route from registration process
   * 
   * Use Cases:
   * - User decides not to register after starting form
   * - User wants to explore app before committing to registration
   * - User accidentally navigated to registration screen
   * - User wants to compare with other services first
   * 
   * UX Considerations:
   * - Button positioned in top right (conventional cancel location)
   * - Red color indicates destructive/exit action
   * - Always visible (fixed position, not part of scroll)
   * - Single tap activation (no confirmation needed for cancel)
   * 
   * Future Enhancement:
   * - Could add confirmation dialog if user has filled multiple fields
   * - Could save draft for user to resume later
   * - Could track cancel rate for UX analytics
   * 
   * @returns {void}
   */
  const handleCancel = () => {
    // Navigate back to home screen
    // This immediately exits the registration flow without saving
    navigation.navigate('BusinessOwnerHomeScreen');
  };

  /**
   * handleRegister
   * Main form submission handler
   * 
   * Validation Flow:
   * 1. Check all required fields are filled (name, email, password, address fields)
   * 2. Validate email format
   * 3. Validate phone number format (if provided - optional field)
   * 4. Validate password strength requirements
   * 
   * Submission Flow:
   * 1. Send POST request to /business_owners/crud/register
   * 2. Convert camelCase field names to snake_case for backend compatibility
   * 3. Convert service radius to number if provided
   * 4. Handle success/error responses from server
   * 5. Navigate to home screen on successful registration
   * 
   * Error Handling:
   * - Validation errors show specific field-level alerts to guide user
   * - Network errors show generic error alert
   * - Server errors show message from backend or generic fallback error
   */
  const handleRegister = async () => {
    // Define which fields are mandatory for registration
    // Missing any of these will prevent form submission and show validation error
    // Note: serviceCategory removed since app now has single user type
    const requiredFields = [
      "name",      // User's full name
      "email",     // Required for login credentials
      "password",  // Required for account security
      "street",    // Address components for location
      "city",
      "state",
      "zipCode",
    ];

    // Check that all required fields have values (not empty strings)
    // Iterate through each required field and validate it has content
    for (let field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        // Show user-friendly alert indicating which field is missing
        Alert.alert("Validation Error", `${field} is required`);
        return; // Stop submission if any required field is empty
      }
    }

    // Validate email format using regex pattern
    // Ensures email has proper structure before sending to backend
    if (!isValidEmail(formData.email)) {
      Alert.alert("Validation Error", "Invalid email format");
      return;
    }
    
    // Validate phone number if provided (phone is optional field)
    // Only validate if user entered something to avoid false errors
    if (formData.phoneNumber && !isValidPhone(formData.phoneNumber)) {
      Alert.alert("Validation Error", "Invalid phone number format");
      return;
    }
    
    // Validate password meets all strength requirements
    // Ensures account security with complex password rules
    if (!isStrongPassword(formData.password)) {
      Alert.alert(
        "Validation Error",
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
      );
      return;
    }

    // All validations passed - proceed with registration API call
    try {
      console.log("📤 Sending registration request...");
      
      // Send POST request to backend registration endpoint
      // Note: Endpoint path kept as /business_owners/crud/register for backend compatibility
      const response = await fetch(
        `${API_URL}/business_owners/crud/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Convert frontend camelCase to backend snake_case
          // Backend expects: name (simplified from business_name), no service_category
          body: JSON.stringify({
            name: formData.name,                    // Simplified from business_name
            description: formData.description,       // Optional description field
            phone_number: formData.phoneNumber,      // Optional phone number
            email: formData.email,                   // Required for login
            password: formData.password,             // Required for authentication
            street: formData.street,                 // Address components
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
            // Convert service radius to number if provided, otherwise send undefined
            // Backend expects number type for this field
            service_radius_miles: formData.serviceRadiusMiles
              ? Number(formData.serviceRadiusMiles)
              : undefined,
          }),
        }
      );

      // Parse JSON response from server
      const data = await response.json();
      console.log("📥 Registration response:", data);
      
      if (response.ok) {
        // Registration successful (HTTP status 200-299)
        console.log("✅ Registration successful!");
        Alert.alert("Success", "User registered successfully!");
        // Navigate back to home screen after successful registration
        navigation.navigate('BusinessOwnerHomeScreen');
      } else {
        // Registration failed (HTTP status 400-599)
        // Check if error is due to existing email
        // Common error messages: "Email already exists", "Email already registered", "Duplicate email"
        const errorMessage = data.message || "";
        const isEmailExistsError = 
          errorMessage.toLowerCase().includes("email") && 
          (errorMessage.toLowerCase().includes("exist") || 
           errorMessage.toLowerCase().includes("already") ||
           errorMessage.toLowerCase().includes("duplicate") ||
           errorMessage.toLowerCase().includes("taken"));

        if (isEmailExistsError) {
          // Show specific alert for existing email with actionable guidance
          // Suggests user to either use different email or try logging in
          console.error("❌ Email already exists");
          Alert.alert(
            "Email Already Registered",
            "This email is already associated with an account. Please use a different email address or try logging in.",
            [{ text: "OK" }]
          );
        } else {
          // Show generic error message from backend or fallback
          console.error("❌ Registration failed:", data);
          Alert.alert("Error", errorMessage || "Registration failed");
        }
      }
    } catch (err) {
      // Network error, timeout, or other exception occurred
      // This catches fetch failures, network issues, or JSON parse errors
      console.error("❌ Frontend registration error:", err);
      Alert.alert("Error", "Failed to register user");
    }
  };

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================
  
  /**
   * Main Form Render
   * 
   * Structure Overview:
   * 
   * 1. Root Container (View)
   *    └─> Full screen container with light gray background
   * 
   * 2. Cancel Button (TouchableOpacity)
   *    └─> Fixed position in top right corner
   *    └─> Overlays scroll content (z-index: 10)
   *    └─> Always visible regardless of scroll position
   * 
   * 3. Scrollable Form (ScrollView)
   *    └─> Contains all form inputs and submit button
   *    └─> Handles keyboard appearance automatically
   *    └─> Allows tapping outside inputs to dismiss keyboard
   *    
   *    Form Contents (in order):
   *    ├─> Title: "User Signup"
   *    ├─> Name Input * (Required)
   *    ├─> Description Input (Optional)
   *    ├─> Phone Number Input (Optional, with phone-pad keyboard)
   *    ├─> Email Input * (Required, with email keyboard)
   *    ├─> Password Input * (Required, with secure entry)
   *    ├─> Street Input * (Required)
   *    ├─> City Input * (Required, auto-populated from zip)
   *    ├─> State Input * (Required, auto-populated from zip)
   *    ├─> Zip Code Input * (Required, triggers auto-population)
   *    │   └─> Loading indicator (shown during city/state lookup)
   *    ├─> Service Radius Input (Optional, triggers auto-scroll)
   *    └─> Register Button (submits form)
   * 
   * Layout Strategy:
   * - Fixed cancel button overlays scrollable content
   * - ScrollView enables access to all fields on small screens
   * - Keyboard-aware scrolling prevents hidden inputs
   * - Auto-scroll on last field ensures button visibility
   * 
   * Accessibility:
   * - All required fields marked with *
   * - Keyboard types optimized for each input
   * - High contrast text for readability
   * - Large touch targets for buttons
   * - Clear visual hierarchy
   * 
   * @returns {JSX.Element} Complete registration form UI
   */
  return (
    <View style={styles.screen}>
      {/* ============================================================
          CANCEL BUTTON - Fixed Top Right
          ============================================================
          Design Pattern: Fixed Overlay Button
          
          Positioning Strategy:
          - position: 'absolute' removes from normal flow
          - top: 40, right: 20 positions in top right corner
          - zIndex: 10 ensures it stays above scrollable content
          
          Visual Design:
          - Red text color signals exit/cancel action
          - No background for minimal visual weight
          - Font weight 600 for visibility
          
          Behavior:
          - Always visible (doesn't scroll)
          - Single tap activation
          - Immediate navigation (no confirmation)
          - Discards all form data
          
          Why This Pattern?
          - Industry standard for cancel button placement
          - Matches iOS/Android navigation patterns
          - Prevents accidental taps (corner location)
          - Remains accessible during form filling
      */}
      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={handleCancel}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      {/* ============================================================
          SCROLLABLE FORM CONTAINER
          ============================================================
          Component: ScrollView
          
          Purpose:
          - Enables scrolling for forms longer than screen height
          - Handles keyboard appearance automatically
          - Provides smooth scroll experience
          
          Props Explained:
          - ref={scrollViewRef}
            Allows programmatic scroll control (used for auto-scroll)
          
          - contentContainerStyle={styles.container}
            Styles applied to the content inside ScrollView
            Note: Don't confuse with ScrollView's own style
            
          - keyboardShouldPersistTaps="handled"
            Allows tapping outside TextInput to dismiss keyboard
            Without this, taps would be ignored when keyboard is visible
            "handled" means: let child components handle taps normally
          
          Content Strategy:
          - All inputs use consistent styling
          - Vertical stack layout with spacing
          - Required fields marked with asterisk (*)
          - Optional fields clearly distinguished
          - Submit button at bottom after all inputs
      */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ============================================================
            FORM TITLE
            ============================================================
            Simple text component displaying the form's purpose
            
            Design: Large (24px), semi-bold (600), centered
            Purpose: Immediately orients user to page function
            Text: "User Signup" (simplified from "Business Owner Signup")
        */}
        <Text style={styles.title}>User Signup</Text>

        {/* ============================================================
            NAME INPUT - Required Field
            ============================================================
            Field Type: Text input (single line)
            Requirement: Required (marked with *)
            Validation: Must not be empty (checked before submission)
            
            Purpose:
            - Primary identifier for the user account
            - Used throughout app to personalize experience
            - Can be individual name or business name
            
            Previous Design:
            - Was "Business Name" when app had separate user types
            - Simplified to just "Name" for single user type app
            
            Controlled Component Pattern:
            - value={formData.name} - displays current state
            - onChangeText={(text) => handleChange("name", text)}
              Updates state on every keystroke
            
            UX Considerations:
            - Standard text keyboard (no special keyboard type)
            - Auto-capitalization enabled by default
            - No character limit (backend may have limits)
            - Clear placeholder with required indicator (*)
        */}
        <TextInput
          placeholder="Name *"
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => handleChange("name", text)}
        />

        {/* ============================================================
            DESCRIPTION INPUT - Optional Field
            ============================================================
            Field Type: Text input (single line, but could be multiline)
            Requirement: Optional (no * marker)
            Validation: None (any text accepted)
            
            Purpose:
            - Allows user to describe themselves or their services
            - Provides additional context beyond just a name
            - Can help with matching users with appropriate services
            - Useful for business users to describe offerings
            
            Use Cases:
            - "Licensed plumber with 10 years experience"
            - "Full-service landscaping and lawn care"
            - "Available weekdays and weekends"
            
            Future Enhancement:
            - Could make this multiline={true} for longer descriptions
            - Could add character counter (e.g., 0/500 characters)
            - Could add helper text with examples
            
            Controlled Component:
            - value={formData.description}
            - onChangeText updates on every character
        */}
        <TextInput
          placeholder="Description"
          style={styles.input}
          value={formData.description}
          onChangeText={(text) => handleChange("description", text)}
        />

        {/* ============================================================
            PHONE NUMBER INPUT - Optional Field
            ============================================================
            Field Type: Text input with numeric keyboard
            Requirement: Optional (validated only if provided)
            Validation: 10-15 digits (if entered)
            
            Keyboard Type: phone-pad
            - Shows numeric keypad with phone symbols
            - Includes: 0-9, *, #, + buttons
            - Optimized for phone number entry
            - Better UX than full numeric keyboard
            
            Purpose:
            - Additional contact method beyond email
            - Useful for urgent communications
            - Some users prefer phone contact
            - Optional because email is primary contact
            
            Validation Strategy:
            - Only validated if user enters something
            - Strips non-numeric characters before validation
            - Accepts: (555) 123-4567, 555-123-4567, 5551234567
            - Must be 10-15 digits after stripping
            
            International Considerations:
            - Currently US-centric (10-15 digits)
            - Could enhance to support country codes
            - Could add country selector dropdown
            - Backend should handle international formats
            
            Privacy Note:
            - Phone numbers are sensitive data
            - Backend should encrypt and protect properly
            - Consider opt-in for sharing with other users
        */}
        <TextInput
          placeholder="Phone Number"
          style={styles.input}
          value={formData.phoneNumber}
          onChangeText={(text) => handleChange("phoneNumber", text)}
          keyboardType="phone-pad"
        />

        {/* ============================================================
            EMAIL INPUT - Required Field
            ============================================================
            Field Type: Text input with email keyboard
            Requirement: Required (marked with *)
            Validation: Must match email regex pattern
            
            Keyboard Type: email-address
            - Includes @ and . keys prominently
            - Lowercase keyboard by default
            - Easier email entry than standard keyboard
            - Reduces typos in email addresses
            
            autoCapitalize="none"
            - Prevents auto-capitalization of first letter
            - Important because emails are case-sensitive in local part
            - Better UX - user doesn't have to manually lowercase
            
            Purpose:
            - Primary identifier for user account (login username)
            - Used for password reset and account recovery
            - Primary communication channel
            - Must be unique across all users
            
            Validation:
            - Format: Must match /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            - Uniqueness: Backend checks if email already registered
            - Special handling for "email already exists" error
            
            Security Considerations:
            - Should never be displayed publicly without consent
            - Consider email verification flow after registration
            - Protect against email enumeration attacks
            
            Error Handling:
            - Invalid format: Shows specific validation error
            - Already exists: Shows friendly "email already registered" message
            - Suggests using different email or logging in
        */}
        <TextInput
          placeholder="Email *"
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => handleChange("email", text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* ============================================================
            PASSWORD INPUT - Required Field
            ============================================================
            Field Type: Text input with secure entry
            Requirement: Required (marked with *)
            Validation: Must meet strength requirements
            
            secureTextEntry={true}
            - Hides password characters as user types
            - Shows dots or asterisks instead of actual characters
            - Prevents "shoulder surfing" (someone looking over shoulder)
            - Standard security practice for password fields
            - Note: Password is still sent as plain text in formData
              (should be hashed/encrypted during transmission via HTTPS)
            
            Keyboard Type: default (full keyboard)
            - Needs full keyboard for special characters
            - Must support uppercase, lowercase, numbers, symbols
            - No special keyboard type for passwords
            
            Password Requirements:
            ✓ Minimum 8 characters
            ✓ At least one uppercase letter (A-Z)
            ✓ At least one lowercase letter (a-z)
            ✓ At least one number (0-9)
            ✓ At least one special character (!@#$%^&*)
            
            Validation Timing:
            - Validated on form submission (not real-time)
            - Shows alert if requirements not met
            - Could enhance with real-time feedback
            
            Security Best Practices:
            - Never store password in plain text (backend responsibility)
            - Always use HTTPS for transmission
            - Consider adding "show password" toggle
            - Consider adding password strength meter
            - Consider password confirmation field
            - Hash on backend before database storage
            
            User Experience:
            - Clear requirements in error message
            - No real-time validation (less annoying)
            - Single field (no confirmation required currently)
            - Could improve with visual strength indicator
            
            Future Enhancements:
            - Add password strength meter (weak/medium/strong)
            - Add "show/hide password" icon button
            - Add confirmation field ("Confirm Password")
            - Real-time validation with inline hints
            - Check against common password databases
        */}
        <TextInput
          placeholder="Password *"
          style={styles.input}
          value={formData.password}
          onChangeText={(text) => handleChange("password", text)}
          secureTextEntry
        />

        {/* ============================================================
            ADDRESS SECTION HEADER
            ============================================================
            The following fields collect complete address information
            
            Purpose:
            - Determine user's physical location
            - Enable location-based service matching
            - Calculate service areas and distances
            - Support mapping and navigation features
            
            All Required:
            - Street, City, State, Zip Code all marked with *
            - Complete address needed for accurate geocoding
            - Missing any component prevents accurate location
            
            Smart Features:
            - City and State auto-populate from Zip Code
            - Reduces typing and prevents errors
            - User can still manually override if needed
        */}
        
        {/* ============================================================
            STREET ADDRESS INPUT - Required Field
            ============================================================
            Field Type: Text input
            Requirement: Required (marked with *)
            Validation: Must not be empty
            
            Purpose:
            - Primary address line
            - Contains house/building number and street name
            - Example: "123 Main Street" or "45 Oak Avenue Apt 2B"
            
            What to Include:
            - House/building number
            - Street name
            - Apartment/unit number (if applicable)
            - Direction (N, S, E, W if applicable)
            
            Examples:
            ✓ "123 Main Street"
            ✓ "45 Oak Ave Apt 2B"
            ✓ "1600 Pennsylvania Avenue NW"
            ✗ "Main Street" (missing number)
            ✗ "" (empty not allowed)
            
            Note: This is address line 1
            Could add "Address Line 2" field for complex addresses
        */}
        <TextInput
          placeholder="Street *"
          style={styles.input}
          value={formData.street}
          onChangeText={(text) => handleChange("street", text)}
        />

        {/* ============================================================
            CITY INPUT - Required Field (AUTO-POPULATED)
            ============================================================
            Field Type: Text input
            Requirement: Required (marked with *)
            Validation: Must not be empty
            Auto-Population: YES - filled when zip code entered
            
            Purpose:
            - City or municipality name
            - Part of complete address for location services
            - Used in address displays and searches
            
            Smart Feature:
            - Automatically populated when user enters 5-digit zip code
            - Fetched from Zippopotam.us API
            - Example: Zip 90210 → City "Beverly Hills"
            - Saves user typing time
            - Reduces spelling errors
            
            User Override:
            - User can manually change if auto-population incorrect
            - Some zip codes span multiple cities
            - User knows their correct city name
            
            Examples:
            ✓ "Los Angeles"
            ✓ "New York"
            ✓ "Chicago"
            
            Behavior:
            - Initially empty (user can type)
            - Auto-fills when valid zip entered
            - Remains editable after auto-fill
        */}
        <TextInput
          placeholder="City *"
          style={styles.input}
          value={formData.city}
          onChangeText={(text) => handleChange("city", text)}
        />

        {/* ============================================================
            STATE INPUT - Required Field (AUTO-POPULATED)
            ============================================================
            Field Type: Text input
            Requirement: Required (marked with *)
            Validation: Must not be empty
            Auto-Population: YES - filled when zip code entered
            
            Purpose:
            - State, province, or region identifier
            - Critical for US address validation
            - Used in location-based queries
            
            Smart Feature:
            - Automatically populated when user enters 5-digit zip code
            - Returns 2-letter state abbreviation from API
            - Example: Zip 90210 → State "CA"
            - Consistent format (always abbreviations from API)
            
            Format:
            - API returns 2-letter abbreviations (CA, NY, TX, etc.)
            - Could enhance to accept full names too
            - Backend should standardize format
            
            User Override:
            - Can manually change if needed
            - Some border zip codes may span states
            - User discretion for correct state
            
            Examples (from auto-population):
            ✓ "CA" (California)
            ✓ "NY" (New York)
            ✓ "TX" (Texas)
            
            Future Enhancement:
            - Could use dropdown with all US states
            - Would prevent invalid state entries
            - Better data consistency
        */}
        <TextInput
          placeholder="State *"
          style={styles.input}
          value={formData.state}
          onChangeText={(text) => handleChange("state", text)}
        />

        {/* ============================================================
            ZIP CODE INPUT - Required Field (WITH AUTO-POPULATION)
            ============================================================
            Field Type: Text input with numeric keyboard and loading indicator
            Requirement: Required (marked with *)
            Validation: Must not be empty, must be 5 digits
            Special Feature: AUTO-POPULATES CITY AND STATE
            
            Container Structure:
            - Wrapped in View (zipCodeContainer) for complex layout
            - Contains TextInput + ActivityIndicator (loading spinner)
            - Flexbox layout positions elements side by side
            
            Keyboard Type: numeric
            - Shows number pad (0-9 only)
            - Optimized for entering numbers
            - Faster than full keyboard for zip codes
            
            maxLength={5}
            - Limits input to 5 characters
            - Prevents user from typing more than valid zip length
            - US zip codes are always 5 digits
            - Backend may support ZIP+4 format (would need maxLength=10)
            
            Smart Auto-Population Feature:
            ================================
            How It Works:
            1. User types in zip code field
            2. onChangeText fires on every keystroke
            3. Updates formData.zipCode state
            4. When exactly 5 digits entered:
               - Calls fetchCityStateFromZip(zipCode)
               - Shows loading spinner (ActivityIndicator)
               - Makes API call to Zippopotam.us
               - Receives city and state data
               - Auto-fills City and State fields
               - Hides loading spinner
            
            API Integration:
            - Service: Zippopotam.us (free, no auth)
            - Endpoint: http://api.zippopotam.us/us/{zipCode}
            - Response: { places: [{ "place name": "City", "state abbreviation": "ST" }] }
            - Fast response time (< 500ms typically)
            
            Loading Indicator:
            - Shows only when isLoadingZipData === true
            - Green spinner matches app theme
            - Positioned to right of input field
            - Small size to not obstruct input
            - Provides visual feedback during API call
            
            Error Handling:
            - Invalid zip codes (99999, 00000) → No alert, manual entry allowed
            - Network errors → Silent fail, manual entry allowed
            - Incomplete zip codes (< 5 digits) → No API call triggered
            
            User Experience Benefits:
            ✓ Saves typing (auto-fills 2 fields from 1 entry)
            ✓ Reduces errors (consistent data from API)
            ✓ Faster form completion
            ✓ Visual feedback with loading spinner
            ✓ Can still manually override if needed
            ✓ Graceful error handling (never blocks user)
            
            Examples:
            - Enter "90210" → Auto-fills: City "Beverly Hills", State "CA"
            - Enter "10001" → Auto-fills: City "New York", State "NY"
            - Enter "60601" → Auto-fills: City "Chicago", State "IL"
            
            Future Enhancements:
            - Support ZIP+4 format (12345-6789)
            - Cache recent lookups to reduce API calls
            - Show error for invalid zip codes
            - Add manual "Lookup" button as alternative
        */}
        <View style={styles.zipCodeContainer}>
          <TextInput
            placeholder="Zip Code *"
            style={[styles.input, styles.zipCodeInput]}
            value={formData.zipCode}
            onChangeText={(text) => {
              // Update zip code in form data state
              // This happens on every keystroke for real-time updates
              handleChange("zipCode", text);
              
              // Smart auto-population trigger
              // Only call API when exactly 5 digits entered
              // This prevents unnecessary API calls for partial entries
              if (text.length === 5) {
                // fetchCityStateFromZip validates format and makes API call
                // See function definition for full implementation details
                fetchCityStateFromZip(text);
              }
            }}
            keyboardType="numeric"
            maxLength={5} // Limit to 5 digits for US zip codes
          />
          
          {/* ========================================================
              LOADING INDICATOR
              ========================================================
              Component: ActivityIndicator (React Native spinner)
              
              Conditional Rendering:
              - Only shown when isLoadingZipData === true
              - State set by fetchCityStateFromZip function
              - True: During API call
              - False: Before call or after completion
              
              Visual Design:
              - size="small" - compact spinner (not intrusive)
              - color="green" - matches app theme
              - Positioned absolutely to right of input
              - Doesn't affect input field layout
              
              Purpose:
              - Provides visual feedback during API call
              - Shows user that something is happening
              - Prevents confusion about delay
              - Improves perceived performance
              
              Positioning:
              - position: 'absolute' (overlays input field)
              - right: 12px, top: 12px (inside input padding)
              - Appears to be "inside" the input field
              - Doesn't shift layout when shown/hidden
          */}
          {isLoadingZipData && (
            <ActivityIndicator 
              size="small" 
              color="green" 
              style={styles.zipCodeLoader}
            />
          )}
        </View>

        {/* ============================================================
            SERVICE RADIUS INPUT - Optional Field
            ============================================================
            Field Type: Text input with numeric keyboard
            Requirement: Optional (no * marker)
            Validation: None (any number accepted)
            Special Feature: AUTO-SCROLLS TO REVEAL SUBMIT BUTTON
            
            Purpose:
            - Indicates service area coverage
            - Measured in miles from user's location
            - Helps match users with appropriate service providers
            - Useful for businesses that travel to customers
            
            Use Cases:
            - Plumber: "I travel up to 25 miles"
            - Gardener: "I work within 10 miles"
            - Delivery: "50 mile radius"
            - Local only: "5 miles"
            
            Keyboard Type: numeric
            - Number pad for easy numeric entry
            - No decimals needed (whole numbers only)
            - Faster than full keyboard
            
            Auto-Scroll Feature:
            ====================
            Problem: On small screens, submit button may be hidden below fold
            Solution: Auto-scroll to bottom when user starts typing here
            
            Implementation:
            - onChangeText handler includes scroll trigger
            - scrollViewRef.current?.scrollToEnd({ animated: true })
            - Animated: true → smooth scroll (better UX)
            - Optional chaining (?.) prevents errors if ref not ready
            
            Why This Field Triggers Scroll:
            - It's the last input field before submit button
            - If user has filled fields down to here, they're almost done
            - Revealing submit button is helpful and expected
            - Reduces need for manual scrolling
            
            Data Type:
            - User enters as string
            - Converted to Number before API submission
            - Backend expects numeric type
            - If empty, sends undefined (not 0)
            
            Examples:
            ✓ "25" → Covers 25 miles around location
            ✓ "50" → Wider service area
            ✓ "10" → Local service only
            ✓ "" → Empty is OK (optional field)
            
            Future Enhancements:
            - Add unit selector (miles/kilometers)
            - Show visual map of coverage area
            - Suggest radius based on user type
            - Validate maximum reasonable radius
        */}
        <TextInput
          placeholder="Service Radius (miles)"
          style={styles.input}
          value={formData.serviceRadiusMiles}
          onChangeText={(text) => {
            // Update service radius in form data
            handleChange("serviceRadiusMiles", text);
            
            // Auto-scroll to bottom to reveal submit button
            // This is a UX enhancement for small screens
            // Ensures user can see submit button without manual scrolling
            // animated: true provides smooth scrolling animation
            // Optional chaining prevents crash if ref not attached
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          keyboardType="numeric"
        />

        {/* ============================================================
            REGISTER BUTTON - Form Submission
            ============================================================
            Component: TouchableOpacity (pressable button)
            Purpose: Submits form after validation
            
            Design:
            - Green background (matches app theme)
            - White text for high contrast
            - Large text (18px) for readability
            - Bold weight (600) for emphasis
            - Rounded corners (12px) for modern look
            - Centered text alignment
            
            Behavior:
            - onPress triggers handleRegister function
            - Validates all fields before submission
            - Shows validation errors if any field invalid
            - Disables during submission (could add)
            - Shows success/error alerts after API response
            - Navigates to home screen on success
            
            Validation Flow (triggered on press):
            1. Check all required fields filled
            2. Validate email format
            3. Validate phone format (if provided)
            4. Validate password strength
            5. If any fail → Show alert, stop submission
            6. If all pass → Send to API
            
            API Call:
            - POST /business_owners/crud/register
            - Sends all form data (camelCase → snake_case)
            - Handles success (201) → Navigate to home
            - Handles errors → Show appropriate alert
            
            Position:
            - Inside ScrollView (scrolls with form)
            - At bottom of form (after all inputs)
            - Has margin-bottom for comfortable scrolling
            
            Accessibility:
            - Large touch target (15px padding)
            - Clear label text
            - High contrast colors
            - Visual feedback on press
            
            Future Enhancements:
            - Add loading state (disable during submission)
            - Show spinner while waiting for API response
            - Add haptic feedback on press
            - Keyboard shortcut (Enter key) to submit
            - Disable if form invalid (real-time validation)
        */}
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};


// ============================================================================
// STYLESHEET
// ============================================================================

/**
 * Component Styling
 * 
 * Styling System: React Native StyleSheet API
 * 
 * Why StyleSheet over Inline Styles?
 * - Performance: Styles compiled once, not recreated on each render
 * - Type Safety: TypeScript validation for style properties
 * - Maintainability: Centralized style definitions
 * - Optimization: React Native can optimize StyleSheet styles
 * 
 * Design System:
 * - Colors: Green theme (#00ff00), white (#fff), light gray (#f9f9f9)
 * - Spacing: 10-20px padding/margins for consistency
 * - Border Radius: 10-12px for modern, friendly appearance
 * - Typography: 16-24px font sizes, 600 weight for emphasis
 * 
 * Responsive Considerations:
 * - Uses flex layouts for adaptability
 * - ScrollView handles overflow on small screens
 * - Absolute positioning for fixed elements
 * - Percentage-based widths where appropriate
 */
const styles = StyleSheet.create({
  // ============================================================
  // SCREEN - Root Container Style
  // ============================================================
  // Purpose: Main container that wraps the entire component
  //
  // flex: 1
  // - Takes up all available vertical space
  // - Ensures component fills screen height
  // - Allows ScrollView to calculate proper height
  //
  // backgroundColor: "#f9f9f9"
  // - Light gray background (neutral, professional)
  // - Provides subtle contrast to white input fields
  // - Reduces eye strain vs. pure white
  // - Common in form designs for better readability
  screen: { 
    flex: 1, 
    backgroundColor: "#f9f9f9" 
  },
  
  // ============================================================
  // CONTAINER - ScrollView Content Wrapper
  // ============================================================
  // Purpose: Styles the content inside ScrollView
  //
  // padding: 20
  // - Adds space on all sides (left, right, top, bottom)
  // - Prevents content from touching screen edges
  // - Improves readability and visual comfort
  // - Standard mobile form padding
  //
  // paddingTop: 60
  // - Extra top padding to accommodate fixed Cancel button
  // - Prevents first form element from hiding under button
  // - Cancel button is 40px from top + needs clearance
  // - Ensures comfortable spacing above form title
  container: { 
    padding: 20,
    paddingTop: 60, // Extra space for Cancel button at top
  },
  
  // ============================================================
  // CANCEL BUTTON - Fixed Top Right Button
  // ============================================================
  // Purpose: Overlay button for exiting registration flow
  //
  // position: 'absolute'
  // - Removes from normal document flow
  // - Stays fixed relative to screen (not ScrollView content)
  // - Allows overlaying other content
  //
  // top: 40, right: 20
  // - Positioned 40px from top (below status bar)
  // - Positioned 20px from right edge
  // - Standard iOS/Android cancel button location
  //
  // zIndex: 10
  // - Ensures button renders above ScrollView content
  // - Prevents content from covering button during scroll
  // - Higher z-index = higher stacking order
  //
  // padding: 10
  // - Increases touch target size
  // - Makes button easier to tap
  // - iOS recommends 44x44pt minimum touch targets
  cancelButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10, // Ensures button stays above scrollable content
    padding: 10,
  },
  
  // ============================================================
  // CANCEL BUTTON TEXT
  // ============================================================
  // Purpose: Styles the text inside cancel button
  //
  // color: 'red'
  // - Red indicates destructive/exit action
  // - Universal design pattern for cancel/close
  // - Stands out against light background
  //
  // fontSize: 16
  // - Readable but not too large
  // - Appropriate for secondary action
  // - Balances with primary button (18px)
  //
  // fontWeight: '600'
  // - Semi-bold for better visibility
  // - Not too heavy (not 'bold' or '700')
  // - Ensures legibility on mobile screens
  cancelButtonText: {
    color: 'red',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // ============================================================
  // TITLE - Form Header Text
  // ============================================================
  // Purpose: Main heading that identifies the form
  //
  // fontSize: 24
  // - Large enough to be clear heading
  // - Creates visual hierarchy (larger than inputs)
  // - Standard heading size for mobile forms
  //
  // fontWeight: "600"
  // - Semi-bold for emphasis without being heavy
  // - Draws attention as primary heading
  // - More readable than lighter weights
  //
  // marginBottom: 20
  // - Space between title and first input
  // - Creates visual separation
  // - Prevents crowded appearance
  //
  // textAlign: "center"
  // - Centers text horizontally
  // - Creates formal, balanced appearance
  // - Standard for form titles
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  
  // ============================================================
  // INPUT - Standard Text Input Field
  // ============================================================
  // Purpose: Base style for all TextInput components
  //
  // backgroundColor: "#fff"
  // - White background for input fields
  // - Contrasts with light gray screen background
  // - Clear visual indication of input areas
  // - Standard input field color
  //
  // borderRadius: 10
  // - Rounded corners (modern design)
  // - Softer appearance than sharp corners
  // - Matches button styling (consistency)
  //
  // padding: 12
  // - Internal spacing around text
  // - Prevents text from touching edges
  // - Creates comfortable typing area
  // - Increases touch target size
  //
  // marginBottom: 15
  // - Space between stacked inputs
  // - Creates visual separation
  // - Prevents crowded appearance
  // - Consistent spacing throughout form
  //
  // fontSize: 16
  // - Readable text size on mobile
  // - iOS: Prevents auto-zoom on focus if >= 16px
  // - Standard body text size
  //
  // borderWidth: 1
  // - Thin border around input
  // - Defines input boundaries clearly
  // - Visual feedback for focusable elements
  //
  // borderColor: "#ccc"
  // - Light gray border (subtle)
  // - Not too heavy or distracting
  // - Complements white background
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  
  // ============================================================
  // BUTTON - Primary Action Button (Register)
  // ============================================================
  // Purpose: Main submit button for form
  //
  // backgroundColor: "green"
  // - App theme color (brand identity)
  // - Indicates positive/proceed action
  // - High contrast with light background
  // - Draws attention as primary CTA
  //
  // padding: 15
  // - Larger padding than inputs
  // - Creates substantial touch target
  // - Makes button feel important
  // - Comfortable for thumbs on mobile
  //
  // borderRadius: 12
  // - Slightly more rounded than inputs
  // - Creates button-like appearance
  // - Modern, friendly design
  //
  // alignItems: "center"
  // - Centers text horizontally
  // - Creates balanced button appearance
  // - Standard button text alignment
  //
  // marginTop: 10
  // - Small space above button
  // - Separates from last input field
  // - Creates visual grouping
  //
  // marginBottom: 20
  // - Space at bottom for comfortable scrolling
  // - Prevents button from touching screen edge
  // - Allows overscroll on some devices
  button: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20, // Space at bottom for comfortable scrolling
  },
  
  // ============================================================
  // BUTTON TEXT - Register Button Text Style
  // ============================================================
  // Purpose: Styles the text inside the register button
  //
  // color: "#fff"
  // - White text on green background
  // - High contrast ratio for accessibility
  // - Ensures readability on colored background
  // - Standard for primary action buttons
  //
  // fontSize: 18
  // - Larger than input text (16px)
  // - Emphasizes importance of action
  // - Easy to read at a glance
  // - Appropriate for button labels
  //
  // fontWeight: "600"
  // - Semi-bold for emphasis
  // - Makes text stand out on button
  // - Not too heavy (maintains elegance)
  // - Consistent with other bold text in app
  buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600" 
  },
  
  // ============================================================
  // ZIP CODE CONTAINER - Special Layout for Zip Input + Loader
  // ============================================================
  // Purpose: Wraps zip code input and loading indicator together
  //
  // flexDirection: 'row'
  // - Arranges children horizontally (side by side)
  // - Input on left, loader on right
  // - Enables complex layout for this field
  //
  // alignItems: 'center'
  // - Vertically centers children
  // - Aligns loader with middle of input
  // - Creates balanced appearance
  //
  // position: 'relative'
  // - Creates positioning context for absolute children
  // - Allows loader to position relative to this container
  // - Enables overlay effect for loading indicator
  //
  // marginBottom: 15
  // - Consistent spacing with other input fields
  // - Maintains visual rhythm in form
  // - Container provides spacing (input's marginBottom = 0)
  //
  // Layout Strategy:
  // - Input takes most of space (flex: 1)
  // - Loader overlays input on right side (position: absolute)
  // - Container manages overall spacing
  zipCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15, // Consistent spacing with other inputs
  },
  
  // ============================================================
  // ZIP CODE INPUT - Modified Input Style for Container
  // ============================================================
  // Purpose: Extends base input style for zip code field
  //
  // flex: 1
  // - Takes up all available horizontal space in container
  // - Allows input to expand while loader overlays
  // - Creates responsive layout
  //
  // marginBottom: 0
  // - Removes default input marginBottom
  // - Parent container (zipCodeContainer) handles spacing
  // - Prevents double spacing issue
  // - Maintains consistent spacing with other fields
  //
  // Note: This style is combined with base input style
  // Usage: style={[styles.input, styles.zipCodeInput]}
  // Result: Inherits all input styles + these overrides
  zipCodeInput: {
    flex: 1,
    marginBottom: 0, // Remove bottom margin, container handles spacing
  },
  
  // ============================================================
  // ZIP CODE LOADER - Loading Spinner Style
  // ============================================================
  // Purpose: Positions and styles the loading indicator
  //
  // position: 'absolute'
  // - Overlays the input field
  // - Doesn't affect layout of other elements
  // - Appears "inside" the input field visually
  //
  // right: 12
  // - Positioned 12px from right edge of container
  // - Aligns with input's internal padding
  // - Appears inside input field's right side
  // - Creates "inline loading" effect
  //
  // top: 12
  // - Positioned 12px from top of container
  // - Vertically centers within input field
  // - Matches input's padding for alignment
  //
  // Visual Effect:
  // - Loader appears inside input field on right side
  // - Doesn't shift input or other elements
  // - Shows/hides without layout changes
  // - Professional loading UX
  //
  // ActivityIndicator Props (in JSX):
  // - size="small" → compact spinner
  // - color="green" → matches app theme
  zipCodeLoader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
});

// ============================================================================
// COMPONENT EXPORT
// ============================================================================
// Export the component as default for importing in other files
// Usage: import SignUpFormBusinessOwners from './SignUpFormBusinessOwners'
export default SignUpFormBusinessOwners;