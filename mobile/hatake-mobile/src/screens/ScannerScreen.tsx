import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { searchService, CardSearchResult } from '../services/search';
import { useStore } from '../store';
import Button from '../components/Button';

export default function ScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [scanning, setScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchedCards, setMatchedCards] = useState<CardSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedGame, setSelectedGame] = useState<'mtg' | 'pokemon'>('mtg');
  const cameraRef = useRef<any>(null);
  const { addToCollection } = useStore();

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      setCapturedImage(photo.uri);
      setScanning(false);
      setShowSearchModal(true);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture');
      setScanning(false);
    }
  };

  const searchCard = async () => {
    if (!searchText.trim()) return;
    
    setShowSearchModal(false);
    setScanning(true);
    
    try {
      const results = await searchService.searchCards(searchText, selectedGame);
      setMatchedCards(results.slice(0, 5));
      setShowResults(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to search');
    } finally {
      setScanning(false);
      setSearchText('');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
      setShowSearchModal(true);
    }
  };

  const handleAddCard = async (card: CardSearchResult) => {
    const result = await addToCollection({
      cardId: card.id,
      cardData: card,
      game: card.game,
      quantity: 1,
      condition: 'near_mint',
    });

    if (result.success) {
      Alert.alert('Success', `${card.name} added to collection!`);
      setShowResults(false);
      setMatchedCards([]);
      setCapturedImage(null);
    } else {
      Alert.alert('Error', result.error || 'Failed to add card');
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={64} color="#D1D5DB" />
          <Text style={styles.permissionText}>Camera access is required</Text>
          <Text style={styles.permissionSubtext}>
            We need camera access to scan your cards
          </Text>
          <Button 
            title="Grant Permission" 
            onPress={requestPermission}
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Card</Text>
        <TouchableOpacity onPress={pickImage}>
          <Ionicons name="images-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Game Toggle */}
      <View style={styles.gameToggle}>
        <TouchableOpacity
          style={[styles.gameButton, selectedGame === 'mtg' && styles.gameButtonActive]}
          onPress={() => setSelectedGame('mtg')}
        >
          <Text style={[styles.gameButtonText, selectedGame === 'mtg' && styles.gameButtonTextActive]}>
            Magic
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gameButton, selectedGame === 'pokemon' && styles.gameButtonActive]}
          onPress={() => setSelectedGame('pokemon')}
        >
          <Text style={[styles.gameButtonText, selectedGame === 'pokemon' && styles.gameButtonTextActive]}>
            Pokémon
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          {/* Card Frame Guide */}
          <View style={styles.frameContainer}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.frameText}>
              Position card within frame
            </Text>
          </View>
        </CameraView>

        {scanning && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.scanningText}>Processing...</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.flipButton}
          onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
        >
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.captureButton}
          onPress={takePicture}
          disabled={scanning}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        
        <View style={{ width: 50 }} />
      </View>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Card Name</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Type the card name..."
              placeholderTextColor="#9CA3AF"
              autoFocus
              returnKeyType="search"
              onSubmitEditing={searchCard}
            />
            
            <Button
              title="Search"
              onPress={searchCard}
              fullWidth
              size="large"
            />
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal
        visible={showResults}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Card</Text>
              <TouchableOpacity onPress={() => setShowResults(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.resultsList}>
              {matchedCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.resultCard}
                  onPress={() => handleAddCard(card)}
                >
                  <Image
                    source={{ uri: card.image_uris?.small || card.images?.small || '' }}
                    style={styles.resultImage}
                    resizeMode="contain"
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{card.name}</Text>
                    <Text style={styles.resultSet}>{card.set_name}</Text>
                    {card.prices?.usd && (
                      <Text style={styles.resultPrice}>${card.prices.usd}</Text>
                    )}
                  </View>
                  <Ionicons name="add-circle" size={32} color="#22C55E" />
                </TouchableOpacity>
              ))}
              
              {matchedCards.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No cards found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  gameToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  gameButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  gameButtonActive: {
    backgroundColor: '#3B82F6',
  },
  gameButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  gameButtonTextActive: {
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 24,
    margin: 16,
  },
  camera: {
    flex: 1,
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 280,
    height: 390,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  frameText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 40,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  permissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  searchModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultsList: {
    padding: 16,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  resultImage: {
    width: 60,
    height: 84,
    borderRadius: 4,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultSet: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  resultPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
    marginTop: 4,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
