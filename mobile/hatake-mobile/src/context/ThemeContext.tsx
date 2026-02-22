import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  primary: string;
  primaryLight: string;
  success: string;
  danger: string;
  warning: string;
  cardBg: string;
}

export const lightTheme: ThemeColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  cardBg: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  background: '#111827',
  surface: '#1F2937',
  surfaceSecondary: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  border: '#374151',
  primary: '#60A5FA',
  primaryLight: '#1E3A5F',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  cardBg: '#1F2937',
};

interface ThemeContextType {
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
  colors: ThemeColors;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      let savedTheme: string | null = null;
      
      if (Platform.OS === 'web') {
        savedTheme = localStorage.getItem('darkMode');
      } else {
        savedTheme = await AsyncStorage.getItem('darkMode');
      }
      
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      } else {
        // Default to system preference
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (e) {
      console.log('Error loading theme:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const setDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('darkMode', String(value));
      } else {
        await AsyncStorage.setItem('darkMode', String(value));
      }
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!isDarkMode);
  };

  const colors = useMemo(() => isDarkMode ? darkTheme : lightTheme, [isDarkMode]);

  const value = useMemo(() => ({
    isDarkMode,
    setDarkMode,
    colors,
    toggleDarkMode,
  }), [isDarkMode, colors]);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
