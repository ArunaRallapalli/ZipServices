import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface WebAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onClose: () => void;
}

export const WebAlert: React.FC<WebAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}) => {
  console.log('🎨 WebAlert render:', { visible, title, message, buttonsCount: buttons.length });
  const handleButtonPress = (button: any) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  button.style === 'destructive' && styles.destructiveButton,
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                    button.style === 'destructive' && styles.destructiveText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
    minWidth: 80,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  destructiveButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButtonText: {
    color: '#333',
  },
  destructiveText: {
    color: '#fff',
  },
});