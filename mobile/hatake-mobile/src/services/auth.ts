import api, { setToken, setStoredUser, removeToken, removeStoredUser, getToken, getStoredUser } from './api';
import { API_ENDPOINTS } from './config';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  is_admin?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

class AuthService {
  // Login with email/password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const data = await api.post<any>(API_ENDPOINTS.LOGIN, credentials);
      
      if (data.success && data.token) {
        await setToken(data.token);
        await setStoredUser(data.user);
        return { success: true, user: data.user, token: data.token };
      }
      
      return { success: false, error: data.error || 'Login failed' };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Network error' 
      };
    }
  }

  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const result = await api.post<any>(API_ENDPOINTS.REGISTER, data);
      
      if (result.success && result.token) {
        await setToken(result.token);
        await setStoredUser(result.user);
        return { success: true, user: result.user, token: result.token };
      }
      
      return { success: false, error: result.error || 'Registration failed' };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Network error' 
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await api.post(API_ENDPOINTS.LOGOUT);
    } catch {
      // Ignore errors, still clear local storage
    }
    await removeToken();
    await removeStoredUser();
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  }

  // Get current user from API
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<any>(API_ENDPOINTS.ME);
      if (response.user) {
        await setStoredUser(response.user);
        return response.user;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Get stored user (offline)
  async getStoredUser(): Promise<User | null> {
    return getStoredUser();
  }

  // Restore session on app start
  async restoreSession(): Promise<User | null> {
    const token = await getToken();
    if (!token) return null;

    // Try to get current user from API
    const user = await this.getCurrentUser();
    if (user) return user;

    // If API fails, try stored user
    const storedUser = await getStoredUser();
    return storedUser;
  }
}

export const authService = new AuthService();
