import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface SettingsScreenProps {
  user: any;
  token: string;
  onClose: () => void;
  onLogout: () => void;
  messengerWidgetEnabled?: boolean;
  onToggleMessengerWidget?: () => void;
}

export default function SettingsScreen({ user, token, onClose, onLogout, messengerWidgetEnabled = true, onToggleMessengerWidget }: SettingsScreenProps) {
  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [tradeNotifications, setTradeNotifications] = useState(true);
  
  // Profile settings
  const [name, setName] = useState(user?.name || '');
  const [shippingAddress, setShippingAddress] = useState('');
  
  // Payment settings - Swedish
  const [paymentSwish, setPaymentSwish] = useState('');
  const [paymentClearing, setPaymentClearing] = useState('');
  const [paymentKontonummer, setPaymentKontonummer] = useState('');
  const [paymentIban, setPaymentIban] = useState('');
  const [paymentSwift, setPaymentSwift] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchSettings = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setName(data.user.name || '');
        setShippingAddress(data.user.shipping_address || '');
        setPaymentSwish(data.user.payment_swish || '');
        setPaymentClearing(data.user.payment_clearing || '');
        setPaymentKontonummer(data.user.payment_kontonummer || '');
        setPaymentIban(data.user.payment_iban || '');
        setPaymentSwift(data.user.payment_swift || '');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          shipping_address: shippingAddress.trim(),
          payment_swish: paymentSwish.trim(),
          payment_clearing: paymentClearing.trim(),
          payment_kontonummer: paymentKontonummer.trim(),
          payment_iban: paymentIban.trim(),
          payment_swift: paymentSwift.trim(),
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        showAlert('Success', 'Profile updated!');
        setActiveSection(null);
      } else {
        showAlert('Error', data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Save profile error:', err);
      showAlert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        onLogout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: onLogout },
        ]
      );
    }
  };

  const renderSettingRow = (
    icon: string,
    title: string,
    subtitle?: string,
    rightElement?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={22} color="#3B82F6" />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <TouchableOpacity 
            style={styles.settingCard}
            onPress={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="person-outline" size={22} color="#3B82F6" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Edit Profile</Text>
                <Text style={styles.settingSubtitle}>Name, shipping address, payment info</Text>
              </View>
              <Ionicons 
                name={activeSection === 'profile' ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#9CA3AF" 
              />
            </View>
            
            {activeSection === 'profile' && (
              <View style={styles.expandedContent}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                />
                
                <Text style={styles.inputLabel}>Shipping Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={shippingAddress}
                  onChangeText={setShippingAddress}
                  placeholder="Street, City, Postal Code, Country"
                  multiline
                  numberOfLines={3}
                />
                
                <Text style={styles.inputLabel}>Swish Number</Text>
                <TextInput
                  style={styles.input}
                  value={paymentSwish}
                  onChangeText={setPaymentSwish}
                  placeholder="070-XXX XX XX"
                  keyboardType="phone-pad"
                />

                <Text style={styles.sectionDivider}>Swedish Bank Account</Text>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Clearing</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentClearing}
                      onChangeText={setPaymentClearing}
                      placeholder="XXXX"
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                  <View style={styles.inputFlex}>
                    <Text style={styles.inputLabel}>Kontonummer</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentKontonummer}
                      onChangeText={setPaymentKontonummer}
                      placeholder="XXX XXX XXXX"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={styles.sectionDivider}>International Transfer</Text>
                
                <Text style={styles.inputLabel}>IBAN</Text>
                <TextInput
                  style={styles.input}
                  value={paymentIban}
                  onChangeText={setPaymentIban}
                  placeholder="SE00 0000 0000 0000 0000 0000"
                  autoCapitalize="characters"
                />
                
                <Text style={styles.inputLabel}>BIC/SWIFT</Text>
                <TextInput
                  style={styles.input}
                  value={paymentSwift}
                  onChangeText={setPaymentSwift}
                  placeholder="XXXXXXXX"
                  autoCapitalize="characters"
                  maxLength={11}
                />
                
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={saveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingCard}>
            {renderSettingRow(
              'notifications-outline',
              'Push Notifications',
              'Receive alerts on your device',
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={pushEnabled ? '#3B82F6' : '#9CA3AF'}
              />
            )}
            
            {renderSettingRow(
              'mail-outline',
              'Email Notifications',
              'Important updates via email',
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={emailNotifications ? '#3B82F6' : '#9CA3AF'}
              />
            )}
            
            {renderSettingRow(
              'chatbubble-outline',
              'Message Alerts',
              'New message notifications',
              <Switch
                value={messageNotifications}
                onValueChange={setMessageNotifications}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={messageNotifications ? '#3B82F6' : '#9CA3AF'}
              />
            )}
            
            {renderSettingRow(
              'swap-horizontal-outline',
              'Trade Alerts',
              'Trade offers and updates',
              <Switch
                value={tradeNotifications}
                onValueChange={setTradeNotifications}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={tradeNotifications ? '#3B82F6' : '#9CA3AF'}
              />
            )}
          </View>
        </View>

        {/* Chat Widget Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Widget</Text>
          
          <View style={styles.settingCard}>
            {renderSettingRow(
              'chatbubble-ellipses-outline',
              'Messenger Widget',
              'Floating chat button on bottom right',
              <Switch
                value={messengerWidgetEnabled}
                onValueChange={onToggleMessengerWidget}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={messengerWidgetEnabled ? '#3B82F6' : '#9CA3AF'}
              />
            )}
          </View>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <View style={styles.settingCard}>
            {renderSettingRow(
              'information-circle-outline',
              'About',
              'Version 1.0.0',
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
            
            {renderSettingRow(
              'document-text-outline',
              'Terms of Service',
              undefined,
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />,
              () => showAlert('Terms', 'Opening terms of service...')
            )}
            
            {renderSettingRow(
              'shield-outline',
              'Privacy Policy',
              undefined,
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />,
              () => showAlert('Privacy', 'Opening privacy policy...')
            )}
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.settingCard}>
            <TouchableOpacity style={styles.logoutRow} onPress={confirmLogout}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hatake.Social © 2026</Text>
          <Text style={styles.footerSubtext}>TCG Trading Platform</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  content: { flex: 1 },
  
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  
  settingCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settingIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1, marginLeft: 12 },
  settingTitle: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
  settingSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  expandedContent: { padding: 16, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 15, color: '#1F2937' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sectionDivider: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 20, marginBottom: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputHalf: { width: 100 },
  inputFlex: { flex: 1 },
  
  saveButton: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  
  footer: { alignItems: 'center', paddingVertical: 30 },
  footerText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  footerSubtext: { fontSize: 12, color: '#D1D5DB', marginTop: 4 },
});
