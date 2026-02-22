'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Users, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface Inviter {
  name: string;
  picture?: string;
  referralCount: number;
}

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [inviter, setInviter] = useState<Inviter | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${code}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInviter(data.inviter);
        } else {
          setInvalid(true);
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">This invite link is not valid or has expired.</p>
          <button onClick={() => router.push('/auth/login')} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center" data-testid="invite-page">
        {/* Logo */}
        <div className="mb-6">
          <Image src="https://i.imgur.com/B06rBhI.png" alt="Hatake.Social" width={64} height={64} className="mx-auto rounded-xl" />
        </div>

        {/* Inviter info */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            {inviter?.picture ? (
              <Image src={inviter.picture} alt={inviter.name} width={48} height={48} className="rounded-full" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {inviter?.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {inviter?.name} invited you!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Join Hatake.Social - The ultimate TCG trading platform
          </p>
        </div>

        {/* Features */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-blue-500">&#x2713;</span> Trade MTG & Pokemon cards
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-blue-500">&#x2713;</span> Build decks with analytics
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-blue-500">&#x2713;</span> Connect with collectors worldwide
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-blue-500">&#x2713;</span> Earn badges and reputation
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push(`/auth/login?invite=${code}`)}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          data-testid="invite-join-btn"
        >
          Join Hatake.Social
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Already have an account? <a href="/auth/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
