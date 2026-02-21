import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Deck {
  deck_id: string;
  name: string;
  description?: string;
  game: string;
  format?: string;
  is_public: boolean;
  card_count: number;
  created_at: string;
  updated_at: string;
}

interface DeckCard {
  id: number;
  card_id: string;
  card_data: any;
  quantity: number;
  is_sideboard: boolean;
}

interface DecksScreenProps {
  user: any;
  token: string;
  onClose: () => void;
}

export default function DecksScreen({ user, token, onClose }: DecksScreenProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeckDetail, setShowDeckDetail] = useState<Deck | null>(null);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  
  // Create deck form
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckGame, setNewDeckGame] = useState<'mtg' | 'pokemon'>('mtg');
  const [newDeckFormat, setNewDeckFormat] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchDecks = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/decks`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setDecks(data.decks || []);
      }
    } catch (err) {
      console.error('Failed to fetch decks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDeckCards = async (deckId: string) => {
    setLoadingCards(true);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/decks/${deckId}/cards`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setDeckCards(data.cards || []);
      }
    } catch (err) {
      console.error('Failed to fetch deck cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) return;
    
    setCreating(true);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/decks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDeckName.trim(),
          game: newDeckGame,
          format: newDeckFormat || null,
          description: newDeckDescription || null,
          isPublic: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewDeckName('');
        setNewDeckDescription('');
        setNewDeckFormat('');
        fetchDecks();
      }
    } catch (err) {
      console.error('Failed to create deck:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteDeck = async (deckId: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setDecks(prev => prev.filter(d => d.deck_id !== deckId));
        setShowDeckDetail(null);
      }
    } catch (err) {
      console.error('Failed to delete deck:', err);
    }
  };

  const openDeckDetail = (deck: Deck) => {
    setShowDeckDetail(deck);
    fetchDeckCards(deck.deck_id);
  };

  const getCardImage = (card: DeckCard) => {
    const data = card.card_data;
    if (data?.image_uris?.small) return data.image_uris.small;
    if (data?.image) return `${data.image}/high.webp`;
    return null;
  };

  const renderDeck = ({ item }: { item: Deck }) => (
    <TouchableOpacity 
      style={styles.deckCard}
      onPress={() => openDeckDetail(item)}
      data-testid={`deck-${item.deck_id}`}
    >
      <View style={styles.deckHeader}>
        <View style={[styles.gameTag, item.game === 'mtg' ? styles.mtgTag : styles.pokemonTag]}>
          <Text style={styles.gameTagText}>
            {item.game === 'mtg' ? 'MTG' : 'PKM'}
          </Text>
        </View>
        {item.format && (
          <Text style={styles.formatText}>{item.format}</Text>
        )}
      </View>
      <Text style={styles.deckName}>{item.name}</Text>
      {item.description && (
        <Text style={styles.deckDescription} numberOfLines={2}>{item.description}</Text>
      )}
      <View style={styles.deckFooter}>
        <View style={styles.cardCount}>
          <Ionicons name="layers" size={14} color="#6B7280" />
          <Text style={styles.cardCountText}>{item.card_count} cards</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDeckCard = ({ item }: { item: DeckCard }) => {
    const imageUrl = getCardImage(item);
    return (
      <View style={styles.deckCardItem}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Ionicons name="image-outline" size={20} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.card_data?.name || 'Unknown'}
          </Text>
          <Text style={styles.cardQuantity}>x{item.quantity}</Text>
        </View>
        {item.is_sideboard && (
          <View style={styles.sideboardBadge}>
            <Text style={styles.sideboardText}>SB</Text>
          </View>
        )}
      </View>
    );
  };

  // Deck Detail View
  if (showDeckDetail) {
    const mainDeck = deckCards.filter(c => !c.is_sideboard);
    const sideboard = deckCards.filter(c => c.is_sideboard);
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowDeckDetail(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{showDeckDetail.name}</Text>
            <Text style={styles.subtitle}>
              {showDeckDetail.game === 'mtg' ? 'Magic' : 'Pokémon'}
              {showDeckDetail.format && ` • ${showDeckDetail.format}`}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteDeck(showDeckDetail.deck_id)}
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {loadingCards ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <ScrollView style={styles.deckContent}>
            {/* Main Deck */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Main Deck ({mainDeck.reduce((sum, c) => sum + c.quantity, 0)})
              </Text>
              {mainDeck.length === 0 ? (
                <Text style={styles.emptyText}>No cards in main deck</Text>
              ) : (
                mainDeck.map((card, idx) => (
                  <View key={`main-${idx}`}>{renderDeckCard({ item: card })}</View>
                ))
              )}
            </View>

            {/* Sideboard */}
            {sideboard.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Sideboard ({sideboard.reduce((sum, c) => sum + c.quantity, 0)})
                </Text>
                {sideboard.map((card, idx) => (
                  <View key={`side-${idx}`}>{renderDeckCard({ item: card })}</View>
                ))}
              </View>
            )}

            <View style={styles.addCardNote}>
              <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.addCardNoteText}>
                To add cards to this deck, use the web app's Deck Builder
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // Decks List View
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>My Decks</Text>
          <Text style={styles.subtitle}>{decks.length} decks</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          data-testid="create-deck-btn"
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={decks}
          renderItem={renderDeck}
          keyExtractor={(item) => item.deck_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDecks(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Decks Yet</Text>
              <Text style={styles.emptySubtitle}>Create your first deck to start building</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.createButtonText}>Create Deck</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Deck Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Deck</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Deck Name"
              placeholderTextColor="#9CA3AF"
              value={newDeckName}
              onChangeText={setNewDeckName}
              data-testid="deck-name-input"
            />

            <View style={styles.gameSelector}>
              <TouchableOpacity
                style={[styles.gameOption, newDeckGame === 'mtg' && styles.gameOptionActive]}
                onPress={() => setNewDeckGame('mtg')}
              >
                <Text style={[styles.gameOptionText, newDeckGame === 'mtg' && styles.gameOptionTextActive]}>
                  Magic: The Gathering
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameOption, newDeckGame === 'pokemon' && styles.gameOptionActive]}
                onPress={() => setNewDeckGame('pokemon')}
              >
                <Text style={[styles.gameOptionText, newDeckGame === 'pokemon' && styles.gameOptionTextActive]}>
                  Pokémon TCG
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Format (e.g., Standard, Modern, Expanded)"
              placeholderTextColor="#9CA3AF"
              value={newDeckFormat}
              onChangeText={setNewDeckFormat}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#9CA3AF"
              value={newDeckDescription}
              onChangeText={setNewDeckDescription}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitButton, (!newDeckName.trim() || creating) && styles.submitButtonDisabled]}
              onPress={createDeck}
              disabled={!newDeckName.trim() || creating}
              data-testid="submit-deck-btn"
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Deck</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  deckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  mtgTag: {
    backgroundColor: '#DBEAFE',
  },
  pokemonTag: {
    backgroundColor: '#FEF3C7',
  },
  gameTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  formatText: {
    fontSize: 12,
    color: '#6B7280',
  },
  deckName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  deckDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  deckFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCountText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  createButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Deck Detail
  deckContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  deckCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  cardImage: {
    width: 40,
    height: 56,
    borderRadius: 4,
  },
  cardPlaceholder: {
    width: 40,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  cardQuantity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sideboardBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sideboardText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  addCardNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  addCardNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  gameSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  gameOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  gameOptionActive: {
    backgroundColor: '#3B82F6',
  },
  gameOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  gameOptionTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
