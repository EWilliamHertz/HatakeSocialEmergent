import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AppHeaderProps {
  title: string;
  onMenuPress: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

export default function AppHeader({ 
  title, 
  onMenuPress, 
  rightIcon,
  onRightPress 
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.menuButton} 
        onPress={onMenuPress}
        data-testid="hamburger-menu-button"
      >
        <Ionicons name="menu" size={26} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {rightIcon ? (
        <TouchableOpacity style={styles.rightButton} onPress={onRightPress}>
          <Ionicons name={rightIcon as any} size={24} color="#1F2937" />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  rightButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
