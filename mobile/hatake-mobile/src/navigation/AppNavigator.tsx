import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Only import LoginScreen for now
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  // Simplified: just show LoginScreen, it handles its own logged-in state
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
