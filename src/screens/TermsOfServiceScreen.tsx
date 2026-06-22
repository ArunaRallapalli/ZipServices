/**
 * TermsOfServiceScreen Component
 * 
 * Displays the complete Terms of Service for GoZipMarket.
 * This screen is accessible from:
 * - Sign up/login screens (via legal agreement links)
 * - Settings/Profile screen
 * - Web footer
 */

import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';

const TermsOfServiceScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Terms of Service for GoZipMarket</Text>
        
        <Text style={styles.date}>Effective Date: December 14, 2024</Text>
        <Text style={styles.date}>Last Updated: December 14, 2024</Text>

        <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
        <Text style={styles.paragraph}>
          These Terms of Service ("Terms") constitute a legally binding agreement between you and Zip Market LLC ("Company," "we," "us," or "our"), operating as GoZipMarket, concerning your access to and use of our mobile application and website (collectively, the "Service").
        </Text>

        <Text style={styles.boldText}>Our Contact Information:</Text>
        <Text style={styles.paragraph}>
          • Business Name: GoZipMarket{'\n'}
          • Legal Entity: Zip Market LLC{'\n'}
          • Address: 30 N Gould St Ste N, Sheridan, WY 82801{'\n'}
          • Email: zipmarket333@gmail.com
        </Text>

        <Text style={styles.warning}>
          BY USING OUR SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        
        <Text style={styles.subSectionTitle}>2.1 Age Requirement</Text>
        <Text style={styles.paragraph}>
          You must be at least 18 years of age to use GoZipMarket. By using the Service, you represent and warrant that you are 18 years or older.
        </Text>

        <Text style={styles.subSectionTitle}>2.2 Account Accuracy</Text>
        <Text style={styles.paragraph}>
          You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
        </Text>

        <Text style={styles.subSectionTitle}>2.3 Account Security</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
        </Text>

        <Text style={styles.sectionTitle}>3. Description of Service</Text>
        <Text style={styles.paragraph}>
          GoZipMarket is a location-based marketplace platform that connects users seeking services ("Customers") with individuals and businesses offering services ("Service Providers"). The Service includes:{'\n\n'}
          • Search Functionality: Finding nearby service providers based on ZIP code{'\n'}
          • Service Listings: Posting and browsing service offerings{'\n'}
          • Messaging: Communication between users{'\n'}
          • Category Requests: Requesting new service categories{'\n'}
          • Profile Management: Creating and managing user profiles
        </Text>

        <Text style={styles.subSectionTitle}>3.1 Platform Role</Text>
        <Text style={styles.warning}>
          IMPORTANT: GoZipMarket is a platform that facilitates connections between users. We are NOT:{'\n\n'}
          • A party to any agreements between Service Providers and Customers{'\n'}
          • Responsible for the quality, safety, or legality of services offered{'\n'}
          • An employer, agent, or representative of Service Providers{'\n'}
          • A guarantor of any transactions or interactions between users
        </Text>

        <Text style={styles.sectionTitle}>4. User Accounts and Responsibilities</Text>
        
        <Text style={styles.subSectionTitle}>4.1 Account Types</Text>
        <Text style={styles.paragraph}>
          Users may function as:{'\n\n'}
          • Service Providers: Posting services they offer{'\n'}
          • Customers: Searching for and contacting service providers{'\n'}
          • Both: Users may both offer and seek services
        </Text>

        <Text style={styles.subSectionTitle}>4.2 Service Provider Responsibilities</Text>
        <Text style={styles.paragraph}>
          If you post services, you represent and warrant that:{'\n\n'}
          • You have the legal right and ability to provide the services you list{'\n'}
          • You hold all necessary licenses, permits, and insurance required by law{'\n'}
          • Your service descriptions are accurate and not misleading{'\n'}
          • You will comply with all applicable laws and regulations{'\n'}
          • You are an independent contractor, not an employee of Zip Market LLC
        </Text>

        <Text style={styles.subSectionTitle}>4.3 Customer Responsibilities</Text>
        <Text style={styles.paragraph}>
          If you seek services, you agree to:{'\n\n'}
          • Verify the credentials and qualifications of Service Providers{'\n'}
          • Exercise reasonable judgment and caution{'\n'}
          • Conduct your own due diligence before engaging any Service Provider{'\n'}
          • Handle all payment arrangements directly with Service Providers
        </Text>

        <Text style={styles.sectionTitle}>5. Prohibited Conduct</Text>
        <Text style={styles.paragraph}>
          You agree NOT to:{'\n\n'}
          <Text style={styles.boldText}>Illegal Activities:</Text>{'\n'}
          • Violate any local, state, national, or international law{'\n'}
          • Engage in fraudulent or deceptive practices{'\n'}
          • Post services that are illegal or violate regulations{'\n\n'}
          <Text style={styles.boldText}>Harmful Behavior:</Text>{'\n'}
          • Harass, abuse, threaten, or intimidate other users{'\n'}
          • Discriminate based on race, ethnicity, national origin, religion, gender, age, disability, or sexual orientation{'\n'}
          • Post false, misleading, or deceptive information{'\n'}
          • Impersonate any person or entity{'\n\n'}
          <Text style={styles.boldText}>Platform Misuse:</Text>{'\n'}
          • Attempt to gain unauthorized access to the Service{'\n'}
          • Interfere with or disrupt the Service or servers{'\n'}
          • Use automated systems (bots, scrapers) without permission{'\n'}
          • Circumvent security features or access controls{'\n'}
          • Collect user information without consent{'\n\n'}
          <Text style={styles.boldText}>Commercial Misuse:</Text>{'\n'}
          • Use the Service for spam or unsolicited advertising{'\n'}
          • Engage in price manipulation or unfair business practices
        </Text>

        <Text style={styles.sectionTitle}>6. Transactions and Payments</Text>
        
        <Text style={styles.subSectionTitle}>6.1 Independent Transactions</Text>
        <Text style={styles.warning}>
          ALL TRANSACTIONS ARE BETWEEN USERS DIRECTLY. GoZipMarket does not:{'\n\n'}
          • Process payments{'\n'}
          • Set prices for services{'\n'}
          • Guarantee payment or service delivery{'\n'}
          • Mediate disputes over payment or services{'\n'}
          • Withhold or escrow funds
        </Text>

        <Text style={styles.subSectionTitle}>6.2 Pricing and Payment Terms</Text>
        <Text style={styles.paragraph}>
          Service Providers are solely responsible for:{'\n\n'}
          • Setting their own prices{'\n'}
          • Negotiating payment terms with Customers{'\n'}
          • Collecting payment from Customers{'\n'}
          • Paying all applicable taxes{'\n'}
          • Issuing invoices or receipts
        </Text>

        <Text style={styles.subSectionTitle}>6.3 No Platform Fees (Current)</Text>
        <Text style={styles.paragraph}>
          At this time, GoZipMarket does not charge fees for using the platform. We reserve the right to implement fees in the future with advance notice to users.
        </Text>

        <Text style={styles.sectionTitle}>7. Disclaimers and Limitations of Liability</Text>
        
        <Text style={styles.subSectionTitle}>7.1 Service "As-Is"</Text>
        <Text style={styles.warning}>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:{'\n\n'}
          • Warranties of merchantability or fitness for a particular purpose{'\n'}
          • Warranties that the Service will be uninterrupted or error-free{'\n'}
          • Warranties regarding the accuracy or reliability of content{'\n'}
          • Warranties that defects will be corrected
        </Text>

        <Text style={styles.subSectionTitle}>7.2 No Endorsement</Text>
        <Text style={styles.warning}>
          WE DO NOT:{'\n\n'}
          • Endorse, guarantee, or verify any Service Provider{'\n'}
          • Conduct background checks on users (unless specifically stated){'\n'}
          • Guarantee the quality, safety, or legality of services{'\n'}
          • Verify licenses, credentials, or insurance{'\n'}
          • Guarantee that services will meet your expectations
        </Text>

        <Text style={styles.subSectionTitle}>7.3 User Interactions</Text>
        <Text style={styles.paragraph}>
          You are solely responsible for your interactions with other users. We recommend:{'\n\n'}
          • Verifying credentials and references{'\n'}
          • Meeting in public places{'\n'}
          • Using secure payment methods{'\n'}
          • Obtaining written contracts for services{'\n'}
          • Ensuring adequate insurance coverage
        </Text>

        <Text style={styles.subSectionTitle}>7.4 Limitation of Liability</Text>
        <Text style={styles.warning}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW:{'\n\n'}
          Zip Market LLC, its officers, directors, employees, and agents SHALL NOT BE LIABLE for:{'\n\n'}
          • Any indirect, incidental, special, consequential, or punitive damages{'\n'}
          • Loss of profits, revenue, data, or goodwill{'\n'}
          • Service interruptions or errors{'\n'}
          • Actions or inactions of users{'\n'}
          • Quality or outcome of services arranged through the platform{'\n'}
          • Disputes between users{'\n'}
          • Any damages exceeding $100 USD{'\n\n'}
          This limitation applies whether based on warranty, contract, tort (including negligence), or any other legal theory, even if we have been advised of the possibility of such damages.
        </Text>

        <Text style={styles.sectionTitle}>8. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify, defend, and hold harmless Zip Market LLC, its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or relating to:{'\n\n'}
          • Your use of the Service{'\n'}
          • Your User Content{'\n'}
          • Your violation of these Terms{'\n'}
          • Your violation of any rights of another person or entity{'\n'}
          • Services you provide or receive through the platform{'\n'}
          • Any disputes with other users
        </Text>

        <Text style={styles.sectionTitle}>9. Termination</Text>
        
        <Text style={styles.subSectionTitle}>9.1 Termination by You</Text>
        <Text style={styles.paragraph}>
          You may terminate your account at any time by:{'\n\n'}
          • Using the account deletion feature in the app{'\n'}
          • Contacting us at zipmarket333@gmail.com
        </Text>

        <Text style={styles.subSectionTitle}>9.2 Termination by Us</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate your account immediately, without prior notice, for:{'\n\n'}
          • Violation of these Terms{'\n'}
          • Fraudulent, abusive, or illegal activity{'\n'}
          • Complaints from other users{'\n'}
          • At our sole discretion for any reason
        </Text>

        <Text style={styles.sectionTitle}>10. Dispute Resolution</Text>
        
        <Text style={styles.subSectionTitle}>10.1 Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms are governed by the laws of the State of Wyoming, United States, without regard to conflict of law principles.
        </Text>

        <Text style={styles.subSectionTitle}>10.2 Jurisdiction and Venue</Text>
        <Text style={styles.paragraph}>
          Any legal action or proceeding relating to these Terms shall be brought exclusively in the state or federal courts located in Sheridan County, Wyoming. You consent to the personal jurisdiction of these courts.
        </Text>

        <Text style={styles.subSectionTitle}>10.3 Class Action Waiver</Text>
        <Text style={styles.paragraph}>
          You agree to bring claims against us only in your individual capacity and not as a plaintiff or class member in any class or representative action.
        </Text>

        <Text style={styles.sectionTitle}>11. General Provisions</Text>
        
        <Text style={styles.subSectionTitle}>11.1 Modifications</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. We will notify you of material changes by:{'\n\n'}
          • Posting the updated Terms on the Service{'\n'}
          • Sending an email notification{'\n'}
          • Displaying a notice in the app{'\n\n'}
          Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms.
        </Text>

        <Text style={styles.subSectionTitle}>11.2 Severability</Text>
        <Text style={styles.paragraph}>
          If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Information</Text>
        <Text style={styles.paragraph}>
          For questions, concerns, or notices regarding these Terms, please contact us:
        </Text>

        <Text style={styles.boldText}>
          Zip Market LLC{'\n'}
          Operating as: GoZipMarket{'\n'}
          30 N Gould St Ste N{'\n'}
          Sheridan, WY 82801{'\n'}
          Email: zipmarket333@gmail.com
        </Text>

        <Text style={styles.sectionTitle}>13. Acknowledgment</Text>
        <Text style={styles.warning}>
          BY CLICKING "I ACCEPT" OR BY USING THE SERVICE, YOU ACKNOWLEDGE THAT:{'\n\n'}
          • You have read and understood these Terms{'\n'}
          • You agree to be bound by these Terms{'\n'}
          • You are at least 18 years of age{'\n'}
          • You understand that GoZipMarket is a platform connecting users and is not a party to transactions between users
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zip Market LLC</Text>
          <Text style={styles.footerText}>Operating as: GoZipMarket</Text>
          <Text style={styles.footerText}>Last Updated: December 14, 2024</Text>
          <Text style={styles.footerText}>These Terms of Service are effective as of the date stated above and apply to all users of the Service.</Text>
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
  warning: {
    fontSize: 14,
    lineHeight: 22,
    color: '#d32f2f',
    fontWeight: '600',
    marginBottom: 10,
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 5,
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

export default TermsOfServiceScreen;