import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false
}: ButtonProps) {
  const getButtonStyle = () => {
    const base = [styles.button, styles[size]];
    
    if (fullWidth) base.push(styles.fullWidth);
    
    switch (variant) {
      case 'secondary':
        base.push(styles.secondary);
        break;
      case 'danger':
        base.push(styles.danger);
        break;
      case 'outline':
        base.push(styles.outline);
        break;
      default:
        base.push(styles.primary);
    }
    
    if (disabled) base.push(styles.disabled);
    
    return base;
  };

  const getTextStyle = () => {
    const base = [styles.text, styles[`${size}Text`]];
    
    if (variant === 'outline') {
      base.push(styles.outlineText);
    }
    
    return base;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#3B82F6' : '#fff'} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  fullWidth: {
    width: '100%',
  },
  // Sizes
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  // Variants
  primary: {
    backgroundColor: '#3B82F6',
  },
  secondary: {
    backgroundColor: '#6B7280',
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  disabled: {
    opacity: 0.5,
  },
  // Text
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  outlineText: {
    color: '#3B82F6',
  },
});
