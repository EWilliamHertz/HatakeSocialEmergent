import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

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

// API request helper using native fetch
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });
  
  if (response.status === 401) {
    // Token expired or invalid, clear storage
    await removeToken();
    await removeStoredUser();
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  
  return data;
}

// API methods
const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'PUT', body }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
  patch: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'PATCH', body }),
};

export default api;
