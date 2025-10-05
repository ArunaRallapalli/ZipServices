/**
 * RoleSwitcher.tsx
 *
 * This component renders a role-switching UI for users who have multiple roles
 * (e.g., 'customer' and 'business_owner'). It displays buttons for each available
 * role, highlights the currently selected role, and triggers the `onRoleChange`
 * callback when a different role is selected. If only one role is available, it
 * renders nothing. Includes icons for visual distinction between roles.
 */



import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface RoleSwitcherProps {
  currentRole: 'customer' | 'business_owner';
  availableRoles: string[];
  onRoleChange: (role: 'customer' | 'business_owner') => void;
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  availableRoles,
  onRoleChange,
}) => {
  if (availableRoles.length <= 1) return null;

  return (
    <View style={styles.roleSwitcher}>
      <Text style={styles.switcherLabel}>Switch Role:</Text>
      <View style={styles.roleButtons}>
        {availableRoles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.roleButton,
              currentRole === role && styles.activeRoleButton,
            ]}
            onPress={() => onRoleChange(role as 'customer' | 'business_owner')}
          >
            <Ionicons
              name={role === 'customer' ? 'person-outline' : 'business-outline'}
              size={16}
              color={currentRole === role ? '#fff' : '#4A90E2'}
            />
            <Text
              style={[
                styles.roleButtonText,
                currentRole === role && styles.activeRoleButtonText,
              ]}
            >
              {role === 'customer' ? 'Customer' : 'Business'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ✅ Add this
const styles = StyleSheet.create({
  roleSwitcher: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
  },
  switcherLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  activeRoleButton: {
    backgroundColor: '#4A90E2',
  },
  roleButtonText: {
    marginLeft: 6,
    color: '#4A90E2',
  },
  activeRoleButtonText: {
    color: '#fff',
  },
});

export default RoleSwitcher;
