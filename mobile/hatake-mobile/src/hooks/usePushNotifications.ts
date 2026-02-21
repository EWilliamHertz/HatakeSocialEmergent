import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { API_URL } from '../config';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface UsePushNotificationsResult {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
  registerForPushNotifications: () => Promise<void>;
}

export function usePushNotifications(token: string): UsePushNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const registerForPushNotifications = async () => {
    try {
      // Check if running on a physical device
      if (!Device.isDevice) {
        setError('Push notifications require a physical device');
        console.log('Push notifications require a physical device');
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('Permission for push notifications was denied');
        console.log('Push notification permission denied');
        return;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                        Constants.easConfig?.projectId;
      
      if (!projectId) {
        setError('Project ID not found in app configuration');
        console.log('No project ID found');
        return;
      }

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      console.log('Expo Push Token:', pushToken.data);
      setExpoPushToken(pushToken.data);

      // Register token with backend
      await registerTokenWithBackend(pushToken.data);

    } catch (err: any) {
      console.error('Error registering for push notifications:', err);
      setError(err.message || 'Failed to register for push notifications');
    }
  };

  const registerTokenWithBackend = async (pushToken: string) => {
    try {
      const authToken = getAuthToken();
      const platform = Platform.OS as 'ios' | 'android' | 'web';

      const response = await fetch(`${API_URL}/api/push-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: pushToken,
          platform: platform,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to register push token with backend:', data.error);
      } else {
        console.log('Push token registered with backend');
      }
    } catch (err: any) {
      console.error('Error registering push token with backend:', err);
    }
  };

  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotifications();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap - navigate to relevant screen based on data
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    });

    // Set up token refresh listener
    const tokenSubscription = Notifications.addPushTokenListener(async (newToken) => {
      console.log('Push token refreshed:', newToken.data);
      setExpoPushToken(newToken.data);
      await registerTokenWithBackend(newToken.data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      tokenSubscription.remove();
    };
  }, [token]);

  return {
    expoPushToken,
    notification,
    error,
    registerForPushNotifications,
  };
}

// Handle notification tap navigation
function handleNotificationTap(data: any) {
  const type = data?.type;
  
  switch (type) {
    case 'friend_request':
      // Navigate to friends screen
      console.log('Navigate to friends');
      break;
    case 'message':
      // Navigate to messages
      console.log('Navigate to messages');
      break;
    case 'trade':
      // Navigate to trades
      console.log('Navigate to trades');
      break;
    case 'reaction':
      // Navigate to feed
      console.log('Navigate to feed');
      break;
    default:
      // Navigate to notifications
      console.log('Navigate to notifications');
  }
}

// Utility to send local notification (for testing)
export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: null, // Immediate
  });
}
