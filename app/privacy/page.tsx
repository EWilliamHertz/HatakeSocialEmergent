'use client';

import Navbar from '@/components/Navbar';
import { Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <Navbar />
      
      <div className="bg-green-600 text-white py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl font-extrabold mb-4">Privacy Policy</h1>
          <p className="text-green-100 text-lg">How we handle your data.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl -mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 md:p-12 prose prose-lg dark:prose-invert max-w-none">
          <p>
            <strong>Hatake Social values your privacy.</strong> This page is currently being updated to reflect our latest GDPR-compliant data practices. 
          </p>
          <p>
            In short:
            <ul>
              <li>We collect your email for authentication.</li>
              <li>Your physical shipping address is only shared with another user when you explicitly agree to a trade with them.</li>
              <li>We do not sell your personal data to third parties.</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
}