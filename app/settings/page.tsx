'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User, Bell, Shield, Moon, Sun, Trash2, Eye, EyeOff, Save, Check, CreditCard, MapPin, Share2, Copy, Link2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Settings state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Shipping
  const [shippingAddress, setShippingAddress] = useState('');
  
  // Payment settings
  const [paymentSwish, setPaymentSwish] = useState('');
  const [paymentClearing, setPaymentClearing] = useState('');
  const [paymentKontonummer, setPaymentKontonummer] = useState('');
  const [paymentIban, setPaymentIban] = useState('');
  const [paymentSwift, setPaymentSwift] = useState('');
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [friendRequestNotifs, setFriendRequestNotifs] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  
  // Privacy
  const [publicProfile, setPublicProfile] = useState(true);
  const [showCollection, setShowCollection] = useState(true);

  // Referral
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeSaving, setInviteCodeSaving] = useState(false);
  const [inviteCodeSaved, setInviteCodeSaved] = useState(false);
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.user) router.push('/auth/login');
        else {
          setUser(data.user);
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          // Fetch full profile for payment info
          fetchProfile();
        }
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.user) {
        setShippingAddress(data.user.shipping_address || '');
        setPaymentSwish(data.user.payment_swish || '');
        setPaymentClearing(data.user.payment_clearing || '');
        setPaymentKontonummer(data.user.payment_kontonummer || '');
        setPaymentIban(data.user.payment_iban || '');
        setPaymentSwift(data.user.payment_swift || '');
        setInviteCode(data.user.invite_code || '');
        setReferralCount(parseInt(data.user.referral_count || '0'));
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name,
          shipping_address: shippingAddress,
          payment_swish: paymentSwish,
          payment_clearing: paymentClearing,
          payment_kontonummer: paymentKontonummer,
          payment_iban: paymentIban,
          payment_swift: paymentSwift,
        })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Save error:', e);
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert(data.error || 'Failed to change password');
      }
    } catch (e) {
      console.error('Change password error:', e);
      alert('Failed to change password');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Settings</h1>
        
        {/* Profile Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold dark:text-white">Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg bg-gray-50 dark:bg-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : (saving ? 'Saving...' : 'Save Changes')}
            </button>
          </div>
        </div>
        
        {/* Password Change */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold dark:text-white">Change Password</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
            <button
              onClick={changePassword}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Change Password
            </button>
          </div>
        </div>
        
        {/* Shipping Address */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-orange-600" />
            <h2 className="text-lg font-semibold dark:text-white">Shipping Address</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Address</label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                placeholder="Street, City, Postal Code, Country"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-semibold dark:text-white">Payment Information</h2>
          </div>
          
          <div className="space-y-6">
            {/* Swish */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Swish Number</label>
              <input
                type="tel"
                value={paymentSwish}
                onChange={(e) => setPaymentSwish(e.target.value)}
                placeholder="070-XXX XX XX"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>

            {/* Swedish Bank Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Swedish Bank Account</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Clearing</label>
                  <input
                    type="text"
                    value={paymentClearing}
                    onChange={(e) => setPaymentClearing(e.target.value)}
                    placeholder="XXXX"
                    maxLength={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Kontonummer</label>
                  <input
                    type="text"
                    value={paymentKontonummer}
                    onChange={(e) => setPaymentKontonummer(e.target.value)}
                    placeholder="XXX XXX XXXX"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* International */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">International Transfer</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">IBAN</label>
                  <input
                    type="text"
                    value={paymentIban}
                    onChange={(e) => setPaymentIban(e.target.value.toUpperCase())}
                    placeholder="SE00 0000 0000 0000 0000 0000"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">BIC/SWIFT</label>
                  <input
                    type="text"
                    value={paymentSwift}
                    onChange={(e) => setPaymentSwift(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    maxLength={11}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : (saving ? 'Saving...' : 'Save Payment Info')}
            </button>
          </div>
        </div>
        
        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Share2 className="w-6 h-6 text-pink-600" />
            <h2 className="text-lg font-semibold dark:text-white">Invite Friends</h2>
            {referralCount > 0 && (
              <span className="text-xs bg-pink-100 dark:bg-pink-900/30 text-pink-600 px-2 py-0.5 rounded-full">{referralCount} referrals</span>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Invite Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value); setInviteCodeError(''); }}
                  placeholder="Choose your invite code (e.g. HatakeHugo)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="invite-code-input"
                />
                <button
                  onClick={async () => {
                    if (!inviteCode.trim()) return;
                    setInviteCodeSaving(true);
                    setInviteCodeError('');
                    try {
                      const res = await fetch('/api/referral', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setInviteCodeSaved(true);
                        setTimeout(() => setInviteCodeSaved(false), 3000);
                      } else {
                        setInviteCodeError(data.error);
                      }
                    } catch { setInviteCodeError('Failed to save'); }
                    setInviteCodeSaving(false);
                  }}
                  disabled={inviteCodeSaving || !inviteCode.trim()}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition flex items-center gap-2"
                  data-testid="save-invite-code-btn"
                >
                  {inviteCodeSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {inviteCodeSaved ? 'Saved!' : 'Save'}
                </button>
              </div>
              {inviteCodeError && <p className="text-red-500 text-sm mt-1">{inviteCodeError}</p>}
            </div>
            
            {inviteCode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Invite Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteCode}`}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:text-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteCode}`);
                      alert('Link copied!');
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center gap-2"
                    data-testid="copy-invite-link-btn"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Share this link with friends. When they sign up, you earn the exclusive Recruiter badge!</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-yellow-600" />
            <h2 className="text-lg font-semibold dark:text-white">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Email Notifications</span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Push Notifications</span>
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Friend Requests</span>
              <input
                type="checkbox"
                checked={friendRequestNotifs}
                onChange={(e) => setFriendRequestNotifs(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Messages</span>
              <input
                type="checkbox"
                checked={messageNotifs}
                onChange={(e) => setMessageNotifs(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
          </div>
        </div>
        
        {/* Privacy */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-semibold dark:text-white">Privacy</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-gray-700 dark:text-gray-300 block">Public Profile</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Allow others to view your profile</span>
              </div>
              <input
                type="checkbox"
                checked={publicProfile}
                onChange={(e) => setPublicProfile(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-gray-700 dark:text-gray-300 block">Show Collection</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Allow others to see your card collection</span>
              </div>
              <input
                type="checkbox"
                checked={showCollection}
                onChange={(e) => setShowCollection(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
