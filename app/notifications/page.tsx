'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Bell, Check, CheckCheck, Users, MessageCircle, ShoppingBag, ArrowRightLeft, Heart, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        setAuthenticated(true);
        return res.json();
      })
      .then(() => loadNotifications())
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId }),
      });
      loadNotifications();
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId }),
      });
      loadNotifications();
    } catch (error) {
      console.error('Delete notification error:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <Users className="w-6 h-6 text-blue-500" />;
      case 'message':
        return <MessageCircle className="w-6 h-6 text-green-500" />;
      case 'listing':
      case 'sale':
        return <ShoppingBag className="w-6 h-6 text-purple-500" />;
      case 'trade':
      case 'trade_accepted':
        return <ArrowRightLeft className="w-6 h-6 text-orange-500" />;
      case 'like':
      case 'comment':
        return <Heart className="w-6 h-6 text-red-500" />;
      default:
        return <Bell className="w-6 h-6 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAsRead()}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition"
              data-testid="mark-all-read"
            >
              <CheckCheck className="w-5 h-5" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="filter-all"
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="filter-unread"
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition ${
                  !notification.read ? 'border-l-4 border-blue-500' : ''
                }`}
                data-testid={`notification-${notification.notification_id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.notification_id)}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                            title="Mark as read"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.notification_id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {notification.link && (
                      <a
                        href={notification.link}
                        className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        View details →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
