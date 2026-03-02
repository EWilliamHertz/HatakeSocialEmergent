'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

const POLL_INTERVAL = 30_000; // 30 seconds
const SEEN_KEY = 'hatake_notif_seen';

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markSeen(ids: string[]) {
  try {
    const seen = getSeenIds();
    ids.forEach(id => seen.add(id));
    // Keep max 500 IDs to prevent bloat
    const arr = Array.from(seen).slice(-500);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

export default function NotificationProvider() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [enabled, setEnabled] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    const savedEnabled = localStorage.getItem('hatake_notifs_enabled') === '1';
    if (Notification.permission === 'granted' && savedEnabled) {
      setEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [enabled]);

  const requestPermission = async () => {
    if (permission === 'unsupported') return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setEnabled(true);
        localStorage.setItem('hatake_notifs_enabled', '1');
        new Notification('Hatake Notifications Enabled 🎉', {
          body: "You'll be notified about messages and friend requests.",
          icon: '/icons/icon-192x192.png',
        });
      }
    } catch (err) {
      console.error('Notification permission error:', err);
    }
  };

  const disableNotifications = () => {
    setEnabled(false);
    localStorage.setItem('hatake_notifs_enabled', '0');
  };

  const startPolling = () => {
    if (pollRef.current) return;
    checkNotifications(); // immediate first check
    pollRef.current = setInterval(checkNotifications, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const notifications = data.notifications || [];
      const seen = getSeenIds();
      const newOnes = notifications.filter((n: any) => !seen.has(String(n.notification_id)) && !n.read);
      if (newOnes.length === 0) return;

      // Show browser notification for each new item (batch if many)
      if (newOnes.length === 1) {
        const n = newOnes[0];
        const title = getNotifTitle(n);
        const body = n.message || 'You have a new notification';
        showBrowserNotif(title, body);
      } else {
        showBrowserNotif(`${newOnes.length} new notifications`, 'Tap to view on Hatake');
      }

      markSeen(newOnes.map((n: any) => String(n.notification_id)));
    } catch {}
  };

  const getNotifTitle = (n: any) => {
    switch (n.type) {
      case 'friend_request': return '👋 New Friend Request';
      case 'friend_accepted': return '🤝 Friend Request Accepted';
      case 'message': return '💬 New Message';
      case 'trade': return '🔄 New Trade Offer';
      default: return '🔔 Hatake';
    }
  };

  const showBrowserNotif = (title: string, body: string) => {
    if (Notification.permission !== 'granted') return;
    try {
      const notif = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'hatake-notif',
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch {}
  };

  // Don't render anything if not supported or already granted (silent operation)
  if (permission === 'unsupported') return null;
  if (permission === 'denied') return null;

  // Show subtle enable button only when not yet enabled
  if (permission === 'granted' && enabled) return null;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 z-40">
      <button
        onClick={permission === 'granted' ? (enabled ? disableNotifications : () => setEnabled(true)) : requestPermission}
        className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        title="Enable notifications"
      >
        <Bell className="w-4 h-4 text-blue-600" />
        <span className="hidden sm:inline">Enable notifications</span>
      </button>
    </div>
  );
}
