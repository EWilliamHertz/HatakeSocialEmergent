import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (Platform.OS === 'web') {
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedSound = localStorage.getItem('soundEnabled');
        if (savedDarkMode !== null) setDarkModeState(savedDarkMode === 'true');
        if (savedSound !== null) setSoundEnabledState(savedSound === 'true');
      } else {
        const savedDarkMode = await AsyncStorage.getItem('darkMode');
        const savedSound = await AsyncStorage.getItem('soundEnabled');
        if (savedDarkMode !== null) setDarkModeState(savedDarkMode === 'true');
        if (savedSound !== null) setSoundEnabledState(savedSound === 'true');
      }
    } catch (e) {
      console.log('Error loading settings:', e);
    }
  };

  const setDarkMode = async (value: boolean) => {
    setDarkModeState(value);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('darkMode', String(value));
      } else {
        await AsyncStorage.setItem('darkMode', String(value));
      }
    } catch (e) {
      console.log('Error saving dark mode:', e);
    }
  };

  const setSoundEnabled = async (value: boolean) => {
    setSoundEnabledState(value);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('soundEnabled', String(value));
      } else {
        await AsyncStorage.setItem('soundEnabled', String(value));
      }
    } catch (e) {
      console.log('Error saving sound setting:', e);
    }
  };

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, soundEnabled, setSoundEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
