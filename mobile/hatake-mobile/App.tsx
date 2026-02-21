import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator, Text, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import FeedScreen from './src/screens/FeedScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import DecksScreen from './src/screens/DecksScreen';
import TradesScreen from './src/screens/TradesScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ReputationScreen from './src/screens/ReputationScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import CreateTradeScreen from './src/screens/CreateTradeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DrawerMenu from './src/components/DrawerMenu';
import IncomingCallNotification from './src/components/IncomingCallNotification';
import MessengerWidget from './src/components/MessengerWidget';
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

interface CallState {
  active: boolean;
  recipient: {
    user_id: string;
    name: string;
    picture?: string;
  } | null;
  callType: 'audio' | 'video';
  isIncoming: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showDecks, setShowDecks] = useState(false);
  const [showTrades, setShowTrades] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReputation, setShowReputation] = useState(false);
  const [showWishlists, setShowWishlists] = useState(false);
  const [showCreateTrade, setShowCreateTrade] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messengerWidgetEnabled, setMessengerWidgetEnabled] = useState(true);
  const [messageRecipient, setMessageRecipient] = useState<any>(null);
  const [callState, setCallState] = useState<CallState>({
    active: false,
    recipient: null,
    callType: 'audio',
    isIncoming: false,
  });
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
    
    // Handle Friends screen
    if (screen === 'friends') {
      setDrawerOpen(false);
      setShowFriends(true);
      return;
    }
    
    // Handle Messages screen
    if (screen === 'messages') {
      setDrawerOpen(false);
      setShowMessages(true);
      return;
    }
    
    // Handle Decks screen
    if (screen === 'deckbuilder') {
      setDrawerOpen(false);
      setShowDecks(true);
      return;
    }
    
    // Handle Trades screen
    if (screen === 'trades') {
      setDrawerOpen(false);
      setShowTrades(true);
      return;
    }
    
    // Handle Groups screen
    if (screen === 'groups') {
      setDrawerOpen(false);
      setShowGroups(true);
      return;
    }
    
    // Handle Notifications
    if (screen === 'notifications') {
      setDrawerOpen(false);
      setShowNotifications(true);
      return;
    }
    
    // Handle Wishlists
    if (screen === 'wishlists') {
      setDrawerOpen(false);
      setShowWishlists(true);
      return;
    }
    
    // Handle Reputation
    if (screen === 'reputation') {
      setDrawerOpen(false);
      setShowReputation(true);
      return;
    }
    
    // Handle Settings
    if (screen === 'settings') {
      setDrawerOpen(false);
      setShowSettings(true);
      return;
    }
    
    console.log('Navigate to:', screen);
    setDrawerOpen(false);
  };

  const handleOpenChat = (friend: any) => {
    setShowFriends(false);
    setMessageRecipient(friend);
    setShowMessages(true);
  };

  const handleStartCall = (recipient: any, callType: 'audio' | 'video') => {
    setCallState({
      active: true,
      recipient,
      callType,
      isIncoming: false,
    });
  };

  const handleEndCall = () => {
    setCallState({
      active: false,
      recipient: null,
      callType: 'audio',
      isIncoming: false,
    });
  };

  const handleIncomingCall = (incomingCall: any) => {
    setCallState({
      active: true,
      recipient: {
        user_id: incomingCall.caller_id,
        name: incomingCall.caller_name,
        picture: incomingCall.caller_picture,
      },
      callType: incomingCall.call_type || 'audio',
      isIncoming: true,
    });
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
                    onOpenNotifications={() => setShowNotifications(true)}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Collection">
                {() => (
                  <CollectionScreen 
                    user={user} 
                    token={token} 
                    onOpenMenu={() => setDrawerOpen(true)} 
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Marketplace">
                {() => (
                  <MarketplaceScreen 
                    user={user} 
                    token={token} 
                    onOpenMenu={() => setDrawerOpen(true)} 
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Profile">
                {() => (
                  <ProfileScreen 
                    user={user} 
                    onLogout={handleLogout} 
                    onOpenMenu={() => setDrawerOpen(true)} 
                  />
                )}
              </Tab.Screen>
            </Tab.Navigator>
            
            <DrawerMenu
              visible={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />

            {/* Friends Modal */}
            <Modal
              visible={showFriends}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowFriends(false)}
            >
              <FriendsScreen
                user={user}
                token={token}
                onClose={() => setShowFriends(false)}
                onOpenChat={handleOpenChat}
              />
            </Modal>

            {/* Messages Modal */}
            <Modal
              visible={showMessages}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => {
                setShowMessages(false);
                setMessageRecipient(null);
              }}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <MessagesScreen
                  user={user}
                  token={token}
                  onClose={() => {
                    setShowMessages(false);
                    setMessageRecipient(null);
                  }}
                  initialRecipient={messageRecipient}
                  onStartCall={handleStartCall}
                />
              </View>
            </Modal>

            {/* Decks Modal */}
            <Modal
              visible={showDecks}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowDecks(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <DecksScreen
                  user={user}
                  token={token}
                  onClose={() => setShowDecks(false)}
                />
              </View>
            </Modal>

            {/* Trades Modal */}
            <Modal
              visible={showTrades}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowTrades(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <TradesScreen
                  user={user}
                  token={token}
                  onClose={() => setShowTrades(false)}
                  onCreateTrade={() => {
                    setShowTrades(false);
                    setShowCreateTrade(true);
                  }}
                />
              </View>
            </Modal>

            {/* Groups Modal */}
            <Modal
              visible={showGroups}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowGroups(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <GroupsScreen
                  user={user}
                  token={token}
                  onClose={() => setShowGroups(false)}
                />
              </View>
            </Modal>

            {/* Notifications Modal */}
            <Modal
              visible={showNotifications}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowNotifications(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <NotificationsScreen
                  user={user}
                  token={token}
                  onClose={() => setShowNotifications(false)}
                />
              </View>
            </Modal>

            {/* Reputation Modal */}
            <Modal
              visible={showReputation}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowReputation(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <ReputationScreen
                  user={user}
                  token={token}
                  onClose={() => setShowReputation(false)}
                />
              </View>
            </Modal>

            {/* Wishlists Modal */}
            <Modal
              visible={showWishlists}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowWishlists(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <WishlistScreen
                  user={user}
                  token={token}
                  onClose={() => setShowWishlists(false)}
                />
              </View>
            </Modal>

            {/* Create Trade Modal */}
            <Modal
              visible={showCreateTrade}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowCreateTrade(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <CreateTradeScreen
                  user={user}
                  token={token}
                  onClose={() => setShowCreateTrade(false)}
                  onTradeCreated={() => {
                    setShowCreateTrade(false);
                    setShowTrades(true);
                  }}
                />
              </View>
            </Modal>

            {/* Settings Modal */}
            <Modal
              visible={showSettings}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setShowSettings(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                <SettingsScreen
                  user={user}
                  token={token}
                  onClose={() => setShowSettings(false)}
                  onLogout={handleLogout}
                  messengerWidgetEnabled={messengerWidgetEnabled}
                  onToggleMessengerWidget={() => setMessengerWidgetEnabled(!messengerWidgetEnabled)}
                />
              </View>
            </Modal>

            {/* Video Call Modal */}
            <Modal
              visible={callState.active}
              animationType="fade"
              presentationStyle="fullScreen"
              onRequestClose={handleEndCall}
            >
              {callState.recipient && (
                <VideoCallScreen
                  user={user}
                  token={token}
                  callState={{
                    recipient: callState.recipient,
                    callType: callState.callType,
                    isIncoming: callState.isIncoming,
                  }}
                  onEndCall={handleEndCall}
                />
              )}
            </Modal>

            {/* Incoming Call Notification - Always listening */}
            {!callState.active && (
              <IncomingCallNotification
                user={user}
                token={token}
                onAcceptCall={handleIncomingCall}
              />
            )}

            {/* Messenger Widget - Floating chat button */}
            <MessengerWidget
              user={user}
              token={token || ''}
              visible={messengerWidgetEnabled}
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
