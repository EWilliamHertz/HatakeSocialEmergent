import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Hatake.Social!',
    description: 'Your ultimate TCG community platform for Magic: The Gathering and Pokemon. Let\'s take a quick tour!',
    icon: 'sparkles',
    color: '#3B82F6',
  },
  {
    id: 'collection',
    title: 'Build Your Collection',
    description: 'Search for cards, add them to your collection, and track what you own. Import cards via CSV for bulk adding!',
    icon: 'albums',
    color: '#10B981',
  },
  {
    id: 'marketplace',
    title: 'Buy & Sell Cards',
    description: 'List your cards for sale or browse the marketplace to find cards you need. Set your prices and manage listings easily.',
    icon: 'storefront',
    color: '#F59E0B',
  },
  {
    id: 'trades',
    title: 'Trade with Others',
    description: 'Propose trades with friends or other collectors. Our rating system helps you trade with confidence!',
    icon: 'swap-horizontal',
    color: '#8B5CF6',
  },
  {
    id: 'social',
    title: 'Connect & Share',
    description: 'Join groups, share your pulls, discuss strategies, and make friends who share your passion for TCGs.',
    icon: 'people',
    color: '#EC4899',
  },
  {
    id: 'deckbuilder',
    title: 'Build Your Decks',
    description: 'Create and manage your decks. Import decklists, add cards manually, and share your builds with the community!',
    icon: 'layers',
    color: '#06B6D4',
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    description: 'Start exploring Hatake.Social! Check out the Feed to see what others are sharing, or search for your first cards.',
    icon: 'rocket',
    color: '#3B82F6',
  },
];

interface OnboardingTourProps {
  visible: boolean;
  onComplete: () => void;
}

export default function OnboardingTour({ visible, onComplete }: OnboardingTourProps) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, currentStep]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(prev => prev + 1);
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
    } catch (e) {
      console.error('Failed to save onboarding status:', e);
    }
    onComplete();
  };

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.92)' }]}>
        <Animated.View 
          style={[
            styles.content,
            { 
              backgroundColor: colors.surface,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: step.color + '20' }]}>
            <Ionicons name={step.icon as any} size={48} color={step.color} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {step.description}
          </Text>

          {/* Progress Dots */}
          <View style={styles.dotsContainer}>
            {TOUR_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: colors.border },
                  index === currentStep && { backgroundColor: step.color, width: 24 },
                ]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {!isLastStep && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: step.color }]}
              onPress={handleNext}
            >
              <Text style={styles.nextText}>
                {isLastStep ? 'Get Started' : 'Next'}
              </Text>
              {!isLastStep && (
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Step Counter */}
          <Text style={[styles.stepCounter, { color: colors.textTertiary }]}>
            {currentStep + 1} of {TOUR_STEPS.length}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Helper function to check if onboarding is needed
export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem('onboarding_complete');
    return completed !== 'true';
  } catch (e) {
    return true;
  }
}

// Helper function to reset onboarding (for testing)
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem('onboarding_complete');
  } catch (e) {
    console.error('Failed to reset onboarding:', e);
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    maxWidth: 200,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepCounter: {
    fontSize: 13,
    marginTop: 16,
  },
});
