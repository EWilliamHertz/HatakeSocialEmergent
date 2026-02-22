import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';

const logoImage = require('../../assets/icon.png');

interface Badge {
  badge_type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  awarded_at: string;
}

interface ProfileScreenProps {
  user: any;
  token: string;
  onLogout: () => void;
  onOpenMenu?: () => void;
  onSettings?: () => void;
}

export default function ProfileScreen({ user, token, onLogout, onOpenMenu, onSettings }: ProfileScreenProps) {
  const { colors } = useTheme();
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    loadBadges();
  }, []);

  const getAuthToken = () => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const loadBadges = async () => {
    try {
      const authToken = getAuthToken();
      // Check & award badges
      await fetch(`${API_URL}/api/badges`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      // Fetch badges
      const res = await fetch(`${API_URL}/api/badges?userId=${user.user_id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setBadges(data.badges || []);
      }
    } catch (err) {
      console.log('Failed to load badges:', err);
    }
  };

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
    onLogout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with menu */}
      <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={onOpenMenu}
        >
          <Ionicons name="menu" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.menuButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="person" size={40} color={colors.textTertiary} />
            </View>
          )}
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
        </View>

        {/* Badges Section */}
        {badges.length > 0 && (
          <View style={[styles.badgesSection, { backgroundColor: colors.surface }]}>
            <View style={styles.badgesHeader}>
              <Ionicons name="ribbon" size={20} color="#F59E0B" />
              <Text style={[styles.badgesTitle, { color: colors.text }]}>Badges</Text>
              <View style={[styles.badgeCount, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeCountText}>{badges.length}</Text>
              </View>
            </View>
            <View style={styles.badgesGrid}>
              {badges.map((badge) => (
                <View
                  key={badge.badge_type}
                  style={[styles.badgeItem, { backgroundColor: badge.color + '15', borderColor: badge.color + '40' }]}
                  data-testid={`mobile-badge-${badge.badge_type}`}
                >
                  <View style={[styles.badgeIcon, { backgroundColor: badge.color + '25' }]}>
                    <Ionicons
                      name={(badge.icon || 'ribbon') as any}
                      size={18}
                      color={badge.color}
                    />
                  </View>
                  <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>{badge.name}</Text>
                  <Text style={[styles.badgeDesc, { color: colors.textTertiary }]} numberOfLines={2}>{badge.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onSettings}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
          
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App Info</Text>
          <View style={styles.infoRow}>
            <Image source={logoImage} style={styles.appIcon} />
            <View>
              <Text style={[styles.appName, { color: colors.text }]}>Hatake.Social</Text>
              <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0 (MVP)</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.surface }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  // Badges
  badgesSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  badgeCount: {
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  appVersion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
});
