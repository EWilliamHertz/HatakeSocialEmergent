import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Notification sound URL (a simple chime)
const NOTIFICATION_SOUND_URL = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';

let soundObject: Audio.Sound | null = null;

export async function playNotificationSound() {
  try {
    if (Platform.OS === 'web') {
      // Use Web Audio API for web
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Play a second beep for emphasis
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.value = 1046.5; // C6 note
        osc2.type = 'sine';
        
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 150);
      
    } else {
      // Use expo-av for native
      if (soundObject) {
        await soundObject.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URL },
        { shouldPlay: true, volume: 0.5 }
      );
      soundObject = sound;
      
      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundObject = null;
        }
      });
    }
  } catch (error) {
    console.log('Error playing notification sound:', error);
  }
}

// Cleanup function
export async function unloadSound() {
  if (soundObject) {
    await soundObject.unloadAsync();
    soundObject = null;
  }
}
