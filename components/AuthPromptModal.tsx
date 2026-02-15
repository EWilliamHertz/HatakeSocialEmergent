'use client';

import { useState } from 'react';
import { X, LogIn, UserPlus, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
  feature?: string;
}

export default function AuthPromptModal({ isOpen, onClose, action = 'continue', feature = 'this feature' }: AuthPromptModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="auth-prompt-modal">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition"
            data-testid="close-auth-prompt"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Join TCG Hub</h2>
          <p className="text-white/80 text-sm">
            Sign in to {action} {feature}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-3">
            <button
              onClick={() => {
                onClose();
                router.push('/auth/login');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              data-testid="auth-prompt-login"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
            
            <button
              onClick={() => {
                onClose();
                router.push('/auth/signup');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              data-testid="auth-prompt-signup"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">With an account you can:</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Build and manage your card collection</li>
            <li>• Buy, sell, and trade cards with others</li>
            <li>• Connect with fellow collectors</li>
            <li>• Save searches and get price alerts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Hook to use the auth prompt throughout the app
import { createContext, useContext, ReactNode } from 'react';

interface AuthPromptContextType {
  showAuthPrompt: (action?: string, feature?: string) => void;
}

const AuthPromptContext = createContext<AuthPromptContextType | undefined>(undefined);

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [promptAction, setPromptAction] = useState('continue');
  const [promptFeature, setPromptFeature] = useState('this feature');

  const showAuthPrompt = (action = 'continue', feature = 'this feature') => {
    setPromptAction(action);
    setPromptFeature(feature);
    setIsOpen(true);
  };

  return (
    <AuthPromptContext.Provider value={{ showAuthPrompt }}>
      {children}
      <AuthPromptModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        action={promptAction}
        feature={promptFeature}
      />
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt() {
  const context = useContext(AuthPromptContext);
  if (context === undefined) {
    throw new Error('useAuthPrompt must be used within an AuthPromptProvider');
  }
  return context;
}
