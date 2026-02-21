import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const API_URL = 'https://www.hatake.eu';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // First check localStorage
      if (typeof localStorage !== 'undefined') {
        const storedUser = localStorage.getItem('user_data');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Verify session is still valid by calling /api/auth/me
          try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
              credentials: 'include',
            });
            const data = await response.json();
            
            if (data.user) {
              setUser(data.user);
              setToken('cookie-auth');
            } else {
              // Session expired, clear localStorage
              localStorage.removeItem('user_data');
            }
          } catch {
            // Network error, use cached user
            setUser(parsedUser);
            setToken('cookie-auth');
          }
        }
      }
    } catch (e) {
      console.log('No stored session');
    }
    setLoading(false);
  };

  const handleLoginSuccess = async (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser);
    setToken(authToken);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // Ignore logout errors
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
    }
    
    setUser(null);
    setToken(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {user && token ? (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: any;
                if (route.name === 'Collection') {
                  iconName = focused ? 'albums' : 'albums-outline';
                } else if (route.name === 'Marketplace') {
                  iconName = focused ? 'storefront' : 'storefront-outline';
                } else if (route.name === 'Profile') {
                  iconName = focused ? 'person' : 'person-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#3B82F6',
              tabBarInactiveTintColor: '#9CA3AF',
              tabBarStyle: {
                backgroundColor: '#fff',
                borderTopColor: '#E5E7EB',
              },
            })}
          >
            <Tab.Screen name="Collection">
              {() => <CollectionScreen user={user} token={token} />}
            </Tab.Screen>
            <Tab.Screen name="Marketplace">
              {() => <MarketplaceScreen user={user} token={token} />}
            </Tab.Screen>
            <Tab.Screen name="Profile">
              {() => <ProfileScreen user={user} onLogout={handleLogout} />}
            </Tab.Screen>
          </Tab.Navigator>
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
});
