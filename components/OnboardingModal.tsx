'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Package, MessageSquare, Users, Star, Trophy } from 'lucide-react';

const STORAGE_KEY = 'hatake_onboarding_done';

const steps = [
  {
    icon: '🃏',
    title: 'Welcome to Hatake Social!',
    subtitle: 'The home for TCG collectors',
    body: 'Buy, sell, trade Pokémon and Magic: The Gathering cards. Connect with thousands of collectors and build your dream collection.',
    cta: 'Get Started',
  },
  {
    icon: '📦',
    title: 'Track Your Collection',
    subtitle: 'Your cards, your value',
    body: 'Import your Pokémon and Magic cards in seconds. We pull live prices from Cardmarket and TCGPlayer so you always know what your collection is worth.',
    cta: 'Sounds good!',
    feature: { icon: Package, label: 'Go to Collection', href: '/collection' },
  },
  {
    icon: '🤝',
    title: 'Trade & Connect',
    subtitle: 'Find the cards you need',
    body: 'Browse the marketplace, propose trades, and message other collectors directly. Post on the feed to show off your best pulls!',
    cta: 'Let\'s go!',
    feature: { icon: MessageSquare, label: 'See Feed', href: '/feed' },
  },
  {
    icon: '🏆',
    title: 'Events & Tournaments',
    subtitle: 'See you at the next one',
    body: 'Find local Pokémon and Magic events, mark your attendance, and meet fellow collectors. You\'re at the right place!',
    cta: 'Start Exploring',
    feature: { icon: Trophy, label: 'Browse Events', href: '/events' },
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Small delay so layout finishes before showing modal
    const timer = setTimeout(() => {
      try {
        const done = localStorage.getItem(STORAGE_KEY);
        if (!done) setVisible(true);
      } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setVisible(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-1 bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Close */}
        <div className="flex justify-end p-4 pb-0">
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 text-center">
          <div className="text-6xl mb-4">{current.icon}</div>
          <h2 className="text-2xl font-bold dark:text-white mb-1">{current.title}</h2>
          <p className="text-blue-600 font-semibold text-sm mb-4">{current.subtitle}</p>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            {current.body}
          </p>

          {current.feature && (
            <a
              href={current.feature.href}
              className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm mb-6"
              onClick={dismiss}
            >
              <current.feature.icon className="w-4 h-4" />
              {current.feature.label}
            </a>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              className={`flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition ${step === 0 ? 'invisible' : ''}`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-blue-600 w-4' : 'bg-gray-300 dark:bg-gray-600'}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex items-center gap-1 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {current.cta}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
