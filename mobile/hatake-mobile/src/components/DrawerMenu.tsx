import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const logoImage = require('../../assets/icon.png');

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

const menuItems: MenuItem[] = [
  { id: 'feed', label: 'Feed', icon: 'newspaper-outline' },
  { id: 'collection', label: 'Collection', icon: 'albums-outline' },
  { id: 'marketplace', label: 'Marketplace', icon: 'storefront-outline' },
  { id: 'trades', label: 'Trades', icon: 'swap-horizontal-outline', badge: 0 },
  { id: 'wishlists', label: 'Wishlists', icon: 'heart-outline' },
  { id: 'reputation', label: 'My Reputation', icon: 'star-outline' },
  { id: 'friends', label: 'Friends', icon: 'people-outline' },
  { id: 'groups', label: 'Groups', icon: 'chatbubbles-outline' },
  { id: 'messages', label: 'Messages', icon: 'mail-outline', badge: 0 },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { id: 'deckbuilder', label: 'Deck Builder', icon: 'layers-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
];

export default function DrawerMenu({ visible, onClose, user, onNavigate, onLogout }: DrawerMenuProps) {
  const screenWidth = Dimensions.get('window').width;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
        
        <View style={[styles.drawer, { width: screenWidth * 0.8, maxWidth: 320 }]}>
          <SafeAreaView style={styles.drawerContent}>
            {/* Header */}
            <View style={styles.header}>
              <Image source={logoImage} style={styles.logo} />
              <Text style={styles.appName}>Hatake.Social</Text>
            </View>

            {/* User Info */}
            <View style={styles.userSection}>
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={styles.userAvatar} />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.menuList}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                >
                  <Ionicons name={item.icon as any} size={22} color="#4B5563" />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerItem} onPress={() => { onNavigate('settings'); onClose(); }}>
                <Ionicons name="settings-outline" size={20} color="#6B7280" />
                <Text style={styles.footerText}>Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  drawer: {
    backgroundColor: '#fff',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 10,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  menuList: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 14,
    flex: 1,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 10,
  },
});
