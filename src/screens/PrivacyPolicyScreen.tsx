/**
 * PrivacyPolicyScreen Component
 * 
 * Displays the complete Privacy Policy for GoZipMarket.
 * This screen is accessible from:
 * - Sign up/login screens (via legal agreement links)
 * - Settings/Profile screen
 * - Web footer
 */

import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';

const PrivacyPolicyScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Privacy Policy for GoZipMarket</Text>
        
        <Text style={styles.date}>Effective Date: December 14, 2024</Text>
        <Text style={styles.date}>Last Updated: December 14, 2024</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to GoZipMarket, operated by Zip Market LLC ("we," "us," or "our"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service").
        </Text>

        <Text style={styles.boldText}>Our Contact Information:</Text>
        <Text style={styles.paragraph}>
          • Business Name: GoZipMarket{'\n'}
          • Legal Entity: Zip Market LLC{'\n'}
          • Address: 30 N Gould St Ste N, Sheridan, WY 82801{'\n'}
          • Email: zipmarket333@gmail.com
        </Text>

        <Text style={styles.paragraph}>
          By using GoZipMarket, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        
        <Text style={styles.subSectionTitle}>2.1 Personal Information You Provide</Text>
        <Text style={styles.paragraph}>
          We collect information that you voluntarily provide when using our Service:
          {'\n\n'}
          • Account Information: Name, email address, phone number, password{'\n'}
          • Profile Information: Profile photo, skills, service descriptions, pricing information, availability{'\n'}
          • Location Data: ZIP code, general location information for service matching{'\n'}
          • Service Listings: Descriptions, categories, images, and pricing of services you offer{'\n'}
          • Messages: Communications sent through our in-app messaging system{'\n'}
          • Service Requests: Categories and descriptions of services you request to be added
        </Text>

        <Text style={styles.subSectionTitle}>2.2 Information Collected Automatically</Text>
        <Text style={styles.paragraph}>
          When you access our Service, we automatically collect:{'\n\n'}
          • Device Information: Device type, operating system, unique device identifiers{'\n'}
          • Usage Data: Features used, pages visited, time spent on the Service{'\n'}
          • Log Data: IP address, browser type, access times, and referring URLs{'\n'}
          • Location Data: Approximate location based on IP address or device settings
        </Text>

        <Text style={styles.subSectionTitle}>2.3 Cookies and Tracking Technologies</Text>
        <Text style={styles.paragraph}>
          We use cookies and similar tracking technologies on our website to:{'\n\n'}
          • Maintain your login session{'\n'}
          • Remember your preferences{'\n'}
          • Analyze how you use our Service{'\n'}
          • Improve user experience{'\n\n'}
          You can control cookies through your browser settings.
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        
        <Text style={styles.subSectionTitle}>3.1 Provide and Maintain the Service</Text>
        <Text style={styles.paragraph}>
          • Create and manage your account{'\n'}
          • Connect service providers with customers based on location and needs{'\n'}
          • Enable messaging between users{'\n'}
          • Display service listings to potential customers{'\n'}
          • Process and respond to service category requests
        </Text>

        <Text style={styles.subSectionTitle}>3.2 Improve and Personalize the Service</Text>
        <Text style={styles.paragraph}>
          • Understand how users interact with our Service{'\n'}
          • Develop new features and functionality{'\n'}
          • Customize content based on your preferences and location{'\n'}
          • Conduct analytics and research
        </Text>

        <Text style={styles.subSectionTitle}>3.3 Communications</Text>
        <Text style={styles.paragraph}>
          • Send you service-related notifications{'\n'}
          • Respond to your inquiries and support requests{'\n'}
          • Notify you about changes to our Service or policies{'\n'}
          • Send promotional communications (with your consent)
        </Text>

        <Text style={styles.subSectionTitle}>3.4 Safety and Security</Text>
        <Text style={styles.paragraph}>
          • Detect, prevent, and address fraud, abuse, and security issues{'\n'}
          • Enforce our Terms of Service{'\n'}
          • Protect the rights and safety of our users and the public{'\n'}
          • Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>4. How We Share Your Information</Text>
        
        <Text style={styles.subSectionTitle}>4.1 Information Shared with Other Users</Text>
        <Text style={styles.boldText}>Public Information:</Text>
        <Text style={styles.paragraph}>
          • Service listings (name, description, category, price range, availability){'\n'}
          • Your profile information (name, profile photo, skills, contact preferences){'\n'}
          • Your general location (ZIP code area)
        </Text>

        <Text style={styles.boldText}>Private Messages:</Text>
        <Text style={styles.paragraph}>
          Messages you send are visible only to the recipient and are stored to facilitate communication.
        </Text>

        <Text style={styles.subSectionTitle}>4.2 Service Providers</Text>
        <Text style={styles.paragraph}>
          We share information with third-party service providers who perform services on our behalf:{'\n\n'}
          • Supabase: Database, authentication, and real-time functionality{'\n'}
          • Hosting Providers: Application hosting and content delivery{'\n'}
          • Analytics Providers: Service usage analysis and improvement{'\n\n'}
          These providers are contractually obligated to protect your information and use it only for the purposes we specify.
        </Text>

        <Text style={styles.subSectionTitle}>4.3 Legal Requirements</Text>
        <Text style={styles.paragraph}>
          We may disclose your information if required to do so by law or in response to:{'\n\n'}
          • Valid legal process (subpoena, court order){'\n'}
          • Requests from government or law enforcement{'\n'}
          • Protection of our rights, property, or safety{'\n'}
          • Investigation of potential violations of our Terms of Service
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your personal information for as long as necessary to:{'\n\n'}
          • Provide you with our Service{'\n'}
          • Comply with legal obligations{'\n'}
          • Resolve disputes and enforce our agreements{'\n\n'}
          When you delete your account, we will delete or anonymize your personal information within 90 days, except where we are required to retain it for legal purposes.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Privacy Rights</Text>
        
        <Text style={styles.subSectionTitle}>6.1 Access and Correction</Text>
        <Text style={styles.paragraph}>
          You can access and update your personal information through your account settings.
        </Text>

        <Text style={styles.subSectionTitle}>6.2 Data Deletion</Text>
        <Text style={styles.paragraph}>
          You have the right to request deletion of your account and associated personal information. Contact us at zipmarket333@gmail.com to request deletion.
        </Text>

        <Text style={styles.subSectionTitle}>6.3 Data Portability</Text>
        <Text style={styles.paragraph}>
          You can request a copy of your personal information in a structured, commonly used format.
        </Text>

        <Text style={styles.subSectionTitle}>6.4 Opt-Out of Communications</Text>
        <Text style={styles.paragraph}>
          You can opt out of promotional emails by following the unsubscribe link in the email or updating your account preferences.
        </Text>

        <Text style={styles.subSectionTitle}>6.5 State-Specific Rights</Text>
        <Text style={styles.boldText}>California Residents (CCPA):</Text>
        <Text style={styles.paragraph}>
          • Right to know what personal information is collected{'\n'}
          • Right to know if personal information is sold or disclosed{'\n'}
          • Right to say no to the sale of personal information{'\n'}
          • Right to access your personal information{'\n'}
          • Right to equal service and price
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          GoZipMarket is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected information from a child under 18, we will take steps to delete such information.
        </Text>

        <Text style={styles.sectionTitle}>8. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect your personal information, including:{'\n\n'}
          • Encryption of data in transit and at rest{'\n'}
          • Secure authentication systems{'\n'}
          • Regular security assessments{'\n'}
          • Access controls and monitoring{'\n\n'}
          However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>9. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by:{'\n\n'}
          • Posting the new Privacy Policy on this page{'\n'}
          • Updating the "Last Updated" date{'\n'}
          • Sending you an email notification (for significant changes){'\n\n'}
          Your continued use of the Service after changes become effective constitutes acceptance of the revised Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:
        </Text>

        <Text style={styles.boldText}>
          Zip Market LLC{'\n'}
          30 N Gould St Ste N{'\n'}
          Sheridan, WY 82801{'\n'}
          Email: zipmarket333@gmail.com
        </Text>

        <Text style={styles.sectionTitle}>11. Consent</Text>
        <Text style={styles.paragraph}>
          By using GoZipMarket, you acknowledge that you have read and understood this Privacy Policy and consent to our collection, use, and disclosure of your information as described herein.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zip Market LLC</Text>
          <Text style={styles.footerText}>Operating as: GoZipMarket</Text>
          <Text style={styles.footerText}>Last Updated: December 14, 2024</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#000',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
    marginBottom: 10,
  },
  boldText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#000',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 3,
  },
});

export default PrivacyPolicyScreen;