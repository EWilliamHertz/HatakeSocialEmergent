import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Platform-aware storage helpers
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
};

// Get stored token
export const getToken = async (): Promise<string | null> => {
  return storage.getItem(TOKEN_KEY);
};

// Store token
export const setToken = async (token: string): Promise<void> => {
  await storage.setItem(TOKEN_KEY, token);
};

// Remove token
export const removeToken = async (): Promise<void> => {
  await storage.removeItem(TOKEN_KEY);
};

// Get stored user
export const getStoredUser = async (): Promise<any | null> => {
  try {
    const userData = await storage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
};

// Store user
export const setStoredUser = async (user: any): Promise<void> => {
  await storage.setItem(USER_KEY, JSON.stringify(user));
};

// Remove user
export const removeStoredUser = async (): Promise<void> => {
  await storage.removeItem(USER_KEY);
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Also set cookie for session-based auth
      config.headers.Cookie = `session_token=${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await removeToken();
      await removeStoredUser();
    }
    return Promise.reject(error);
  }
);

export default api;
