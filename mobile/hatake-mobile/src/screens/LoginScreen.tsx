import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://www.hatake.eu';
const logoImage = require('../../assets/icon.png');

export default function LoginScreen() {
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('password');
  const [status, setStatus] = useState('Ready to login');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const doLogin = async () => {
    setLoading(true);
    setStatus('Starting login...');
    
    try {
      setStatus('Sending request to ' + API_URL + '/api/auth/login');
      
      const response = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      setStatus('Got response, status: ' + response.status);
      
      const text = await response.text();
      setStatus('Response text length: ' + text.length);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        setStatus('Failed to parse JSON: ' + text.substring(0, 100));
        setLoading(false);
        return;
      }
      
      if (data.success) {
        setStatus('LOGIN SUCCESS! User: ' + data.user.email);
        setUserData(data.user);
        setLoggedIn(true);
        // Store token
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user_data', JSON.stringify(data.user));
        }
      } else {
        setStatus('Login failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setStatus('ERROR: ' + (err.message || String(err)));
    }
    
    setLoading(false);
  };

  if (loggedIn && userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.successText}>Logged in as: {userData.email}</Text>
          <Text style={styles.successText}>Name: {userData.name}</Text>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => {
              setLoggedIn(false);
              setUserData(null);
              setStatus('Logged out');
              if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
              }
            }}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Hatake.Social</Text>
        <Text style={styles.subtitle}>TCG Trading Platform</Text>
        
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
        
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={doLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.apiText}>API: {API_URL}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
  },
  statusBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  apiText: {
    marginTop: 24,
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#059669',
    textAlign: 'center',
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
});
