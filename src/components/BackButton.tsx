import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps {
  onPress?: () => void;
  text?: string;
  iconColor?: string;
  textColor?: string;
  backgroundColor?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  onPress, 
  text = 'Back',
  iconColor = '#4A90E2',
  textColor = '#4A90E2',
  backgroundColor = '#fff',
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.backButton, { backgroundColor }]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color={iconColor} />
      <Text style={[styles.backButtonText, { color: textColor }]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});