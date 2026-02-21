import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator, Text, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import FeedScreen from './src/screens/FeedScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DrawerMenu from './src/components/DrawerMenu';
import { API_URL } from './src/config';

const Tab = createBottomTabNavigator();

// Navigation ref for programmatic navigation
type RootTabParamList = {
  Feed: undefined;
  Collection: undefined;
  Marketplace: undefined;
  Profile: undefined;
};

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootTabParamList>>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user_data');
        if (storedToken && storedUser) {
          // Verify token is still valid
          try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
              headers: { 'Authorization': `Bearer ${storedToken}` },
            });
            const data = await response.json();
            
            if (data.user) {
              setUser(data.user);
              setToken(storedToken);
            } else {
              // Use cached data if API fails but we have token
              setUser(JSON.parse(storedUser));
              setToken(storedToken);
            }
          } catch {
            // Network error, use cached user
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          }
        }
      }
    } catch (e) {
      console.log('No stored session');
    }
    setLoading(false);
  };

  const handleLoginSuccess = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser);
    setToken(authToken);
  };

  const handleLogout = async () => {
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
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
    setDrawerOpen(false);
  };

  const handleNavigate = (screen: string) => {
    // Handle navigation - these screens are in bottom tabs
    const bottomTabScreens = ['feed', 'collection', 'marketplace', 'profile'];
    
    if (bottomTabScreens.includes(screen)) {
      // Map to correct tab name with proper casing
      const tabMap: Record<string, keyof RootTabParamList> = {
        'feed': 'Feed',
        'collection': 'Collection',
        'marketplace': 'Marketplace',
        'profile': 'Profile',
      };
      const tabName = tabMap[screen];
      if (tabName && navigationRef.current) {
        navigationRef.current.navigate(tabName);
      }
      setDrawerOpen(false);
      return;
    }
    
    // Show coming soon for screens not yet implemented in mobile
    const comingSoonScreens = ['trades', 'wishlists', 'friends', 'groups', 'messages', 'deckbuilder', 'settings'];
    if (comingSoonScreens.includes(screen)) {
      const screenNames: Record<string, string> = {
        'trades': 'Trades',
        'wishlists': 'Wishlists',
        'friends': 'Friends',
        'groups': 'Groups',
        'messages': 'Messages',
        'deckbuilder': 'Deck Builder',
        'settings': 'Settings',
      };
      const name = screenNames[screen] || screen;
      
      if (Platform.OS === 'web') {
        alert(`${name} - Coming soon to the mobile app! Available now on the web version.`);
      } else {
        Alert.alert(
          `${name}`,
          'Coming soon to the mobile app! Available now on the web version.',
          [{ text: 'OK' }]
        );
      }
      setDrawerOpen(false);
      return;
    }
    
    console.log('Navigate to:', screen);
    setDrawerOpen(false);
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
      <NavigationContainer ref={navigationRef}>
        {user && token ? (
          <>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName: any;
                  if (route.name === 'Feed') {
                    iconName = focused ? 'newspaper' : 'newspaper-outline';
                  } else if (route.name === 'Collection') {
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
              <Tab.Screen name="Feed">
                {() => (
                  <FeedScreen 
                    user={user} 
                    token={token} 
                    onOpenMenu={() => setDrawerOpen(true)} 
                  />
                )}
              </Tab.Screen>
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
            
            <DrawerMenu
              visible={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          </>
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
