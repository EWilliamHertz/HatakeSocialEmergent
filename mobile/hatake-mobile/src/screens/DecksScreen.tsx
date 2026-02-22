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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  // For community decks
  user_id?: string;
  user_name?: string;
  user_picture?: string;
}

interface DeckCard {
  id: number;
  card_id: string;
  card_data: any;
  quantity: number;
  is_sideboard: boolean;
}

// Mana cost distribution for MTG decks
interface ManaCurve {
  [cost: number]: number;
}

interface DecksScreenProps {
  user: any;
  token: string;
  onClose: () => void;
}

// MTG format options
const MTG_FORMATS = ['Standard', 'Modern', 'Pioneer', 'Legacy', 'Vintage', 'Commander', 'Pauper', 'Historic'];
// Pokemon format options
const POKEMON_FORMATS = ['Standard', 'Expanded', 'Unlimited', 'GLC'];

export default function DecksScreen({ user, token, onClose }: DecksScreenProps) {
  const { colors } = useTheme();
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [communityDecks, setCommunityDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'my' | 'community'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeckDetail, setShowDeckDetail] = useState<Deck | null>(null);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  
  // Filters
  const [gameFilter, setGameFilter] = useState<'all' | 'mtg' | 'pokemon'>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Create deck form
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckGame, setNewDeckGame] = useState<'mtg' | 'pokemon'>('mtg');
  const [newDeckFormat, setNewDeckFormat] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [newDeckPublic, setNewDeckPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  // Import & Add Card
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardSearchResults, setCardSearchResults] = useState<any[]>([]);
  const [searchingCards, setSearchingCards] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

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
      
      // Fetch my decks
      const myRes = await fetch(`${API_URL}/api/decks`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const myData = await myRes.json();
      if (myData.success) {
        setMyDecks(myData.decks || []);
      }
      
      // Fetch community decks
      const communityRes = await fetch(`${API_URL}/api/decks?type=community`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const communityData = await communityRes.json();
      if (communityData.success) {
        setCommunityDecks(communityData.decks || []);
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
          isPublic: newDeckPublic,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewDeckName('');
        setNewDeckDescription('');
        setNewDeckFormat('');
        setNewDeckPublic(false);
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
        setMyDecks(prev => prev.filter(d => d.deck_id !== deckId));
        setShowDeckDetail(null);
      }
    } catch (err) {
      console.error('Failed to delete deck:', err);
    }
  };

  const copyDeck = async (deck: Deck) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/decks/${deck.deck_id}/copy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchDecks();
        setShowDeckDetail(null);
        setTab('my');
      }
    } catch (err) {
      console.error('Failed to copy deck:', err);
    }
  };

  // Import decklist from text (MTGO format, etc.)
  const importDecklist = async () => {
    if (!importText.trim() || !showDeckDetail) return;
    
    setImporting(true);
    try {
      const authToken = getAuthToken();
      const lines = importText.trim().split('\n');
      const cards: { name: string; quantity: number; isSideboard: boolean }[] = [];
      let isSideboard = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Check for sideboard marker
        if (trimmed.toLowerCase() === 'sideboard' || trimmed.toLowerCase() === 'sideboard:') {
          isSideboard = true;
          continue;
        }
        
        // Parse "4 Lightning Bolt" or "4x Lightning Bolt" format
        const match = trimmed.match(/^(\d+)x?\s+(.+)$/i);
        if (match) {
          cards.push({
            quantity: parseInt(match[1], 10),
            name: match[2].trim(),
            isSideboard,
          });
        } else {
          // Assume 1 copy if no quantity
          cards.push({
            quantity: 1,
            name: trimmed,
            isSideboard,
          });
        }
      }
      
      // Add each card to the deck
      let successCount = 0;
      for (const card of cards) {
        try {
          // Search for the card first
          const searchUrl = showDeckDetail.game === 'mtg'
            ? `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(card.name)}`
            : `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(card.name)}`;
          
          const searchRes = await fetch(searchUrl);
          const searchData = await searchRes.json();
          
          let cardData: any = null;
          let cardId = '';
          
          if (showDeckDetail.game === 'mtg' && searchData.id) {
            cardData = searchData;
            cardId = searchData.id;
          } else if (showDeckDetail.game === 'pokemon' && Array.isArray(searchData) && searchData.length > 0) {
            cardData = searchData[0];
            cardId = searchData[0].id;
          }
          
          if (cardId && cardData) {
            const addRes = await fetch(`${API_URL}/api/decks/${showDeckDetail.deck_id}/cards`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cardId,
                cardData,
                quantity: card.quantity,
                isSideboard: card.isSideboard,
              }),
            });
            const addData = await addRes.json();
            if (addData.success) successCount++;
          }
        } catch (cardErr) {
          console.error(`Failed to add card: ${card.name}`, cardErr);
        }
      }
      
      if (successCount > 0) {
        fetchDeckCards(showDeckDetail.deck_id);
        fetchDecks();
      }
      
      setShowImportModal(false);
      setImportText('');
      alert(`Imported ${successCount} of ${cards.length} cards`);
    } catch (err) {
      console.error('Failed to import decklist:', err);
      alert('Import failed. Please check the format.');
    } finally {
      setImporting(false);
    }
  };

  // Search for cards to add
  const searchCards = async () => {
    if (!cardSearchQuery.trim() || !showDeckDetail) return;
    
    setSearchingCards(true);
    try {
      if (showDeckDetail.game === 'mtg') {
        const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(cardSearchQuery)}&order=name`);
        const data = await res.json();
        setCardSearchResults(data.data?.slice(0, 20) || []);
      } else {
        const res = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cardSearchQuery)}`);
        const data = await res.json();
        setCardSearchResults(Array.isArray(data) ? data.slice(0, 20) : []);
      }
    } catch (err) {
      console.error('Card search failed:', err);
      setCardSearchResults([]);
    } finally {
      setSearchingCards(false);
    }
  };

  // Add a card to the deck
  const addCardToDeck = async (card: any, quantity: number = 1, isSideboard: boolean = false) => {
    if (!showDeckDetail) return;
    
    setAddingCard(true);
    try {
      const authToken = getAuthToken();
      const cardId = card.id;
      
      const res = await fetch(`${API_URL}/api/decks/${showDeckDetail.deck_id}/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId,
          cardData: card,
          quantity,
          isSideboard,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDeckCards(showDeckDetail.deck_id);
        fetchDecks();
        setCardSearchQuery('');
        setCardSearchResults([]);
      }
    } catch (err) {
      console.error('Failed to add card:', err);
    } finally {
      setAddingCard(false);
    }
  };

  // Remove a card from deck
  const removeCardFromDeck = async (cardId: string) => {
    if (!showDeckDetail) return;
    
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/decks/${showDeckDetail.deck_id}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchDeckCards(showDeckDetail.deck_id);
        fetchDecks();
      }
    } catch (err) {
      console.error('Failed to remove card:', err);
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

  // Calculate mana curve for MTG decks
  const calculateManaCurve = (cards: DeckCard[]): ManaCurve => {
    const curve: ManaCurve = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    cards.filter(c => !c.is_sideboard).forEach(card => {
      const cmc = card.card_data?.cmc || 0;
      const costBucket = Math.min(Math.floor(cmc), 6); // 6+ goes in the 6 bucket
      curve[costBucket] = (curve[costBucket] || 0) + card.quantity;
    });
    return curve;
  };

  // Get available formats based on game filter
  const getFormats = () => {
    if (gameFilter === 'mtg') return MTG_FORMATS;
    if (gameFilter === 'pokemon') return POKEMON_FORMATS;
    return [...MTG_FORMATS, ...POKEMON_FORMATS].filter((v, i, a) => a.indexOf(v) === i);
  };

  // Filter decks
  const filterDecks = (decks: Deck[]) => {
    return decks.filter(deck => {
      if (gameFilter !== 'all' && deck.game !== gameFilter) return false;
      if (formatFilter !== 'all' && deck.format?.toLowerCase() !== formatFilter.toLowerCase()) return false;
      return true;
    });
  };

  const currentDecks = tab === 'my' ? filterDecks(myDecks) : filterDecks(communityDecks);

  const renderDeck = ({ item }: { item: Deck }) => (
    <TouchableOpacity 
      style={[styles.deckCard, { backgroundColor: colors.surface }]}
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
          <Text style={[styles.formatText, { color: colors.textSecondary }]}>{item.format}</Text>
        )}
        {item.is_public && (
          <Ionicons name="globe-outline" size={14} color="#10B981" style={{ marginLeft: 'auto' }} />
        )}
      </View>
      <Text style={[styles.deckName, { color: colors.text }]}>{item.name}</Text>
      {item.description && (
        <Text style={[styles.deckDescription, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
      )}
      
      {/* Community deck author info */}
      {tab === 'community' && item.user_name && (
        <View style={styles.authorRow}>
          {item.user_picture ? (
            <Image source={{ uri: item.user_picture }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="person" size={12} color={colors.textTertiary} />
            </View>
          )}
          <Text style={[styles.authorName, { color: colors.textSecondary }]}>by {item.user_name}</Text>
        </View>
      )}
      
      <View style={[styles.deckFooter, { borderTopColor: colors.border }]}>
        <View style={styles.cardCount}>
          <Ionicons name="layers" size={14} color={colors.textSecondary} />
          <Text style={[styles.cardCountText, { color: colors.textSecondary }]}>{item.card_count} cards</Text>
        </View>
        <Text style={[styles.dateText, { color: colors.textTertiary }]}>
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

  // Mana Curve Component
  const ManaCurveChart = ({ curve }: { curve: ManaCurve }) => {
    const maxCount = Math.max(...Object.values(curve), 1);
    
    return (
      <View style={styles.manaCurveContainer}>
        <Text style={styles.manaCurveTitle}>Mana Curve</Text>
        <View style={styles.manaCurveChart}>
          {Object.entries(curve).map(([cost, count]) => (
            <View key={cost} style={styles.manaCurveBar}>
              <View 
                style={[
                  styles.manaCurveBarFill,
                  { height: Math.max((count / maxCount) * 80, 4) }
                ]}
              />
              <Text style={styles.manaCurveLabel}>{cost === '6' ? '6+' : cost}</Text>
              <Text style={styles.manaCurveCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Deck Detail View
  if (showDeckDetail) {
    const mainDeck = deckCards.filter(c => !c.is_sideboard);
    const sideboard = deckCards.filter(c => c.is_sideboard);
    const manaCurve = showDeckDetail.game === 'mtg' ? calculateManaCurve(deckCards) : null;
    const isOwner = showDeckDetail.user_id === user.user_id || !showDeckDetail.user_id;
    
    return (
      <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowDeckDetail(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.text }]}>{showDeckDetail.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {showDeckDetail.game === 'mtg' ? 'Magic' : 'Pokemon'}
              {showDeckDetail.format && ` - ${showDeckDetail.format}`}
            </Text>
          </View>
          {isOwner ? (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteDeck(showDeckDetail.deck_id)}
              data-testid="delete-deck-btn"
            >
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyDeck(showDeckDetail)}
              data-testid="copy-deck-btn"
            >
              <Ionicons name="copy-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {loadingCards ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.deckContent}>
            {/* Deck Stats */}
            <View style={[styles.deckStatsRow, { backgroundColor: colors.surface }]}>
              <View style={styles.deckStat}>
                <Text style={[styles.deckStatValue, { color: colors.text }]}>{mainDeck.reduce((sum, c) => sum + c.quantity, 0)}</Text>
                <Text style={[styles.deckStatLabel, { color: colors.textSecondary }]}>Main</Text>
              </View>
              <View style={styles.deckStat}>
                <Text style={[styles.deckStatValue, { color: colors.text }]}>{sideboard.reduce((sum, c) => sum + c.quantity, 0)}</Text>
                <Text style={[styles.deckStatLabel, { color: colors.textSecondary }]}>Sideboard</Text>
              </View>
              <View style={styles.deckStat}>
                <Text style={[styles.deckStatValue, { color: colors.text }]}>{deckCards.length}</Text>
                <Text style={[styles.deckStatLabel, { color: colors.textSecondary }]}>Unique</Text>
              </View>
            </View>

            {/* Mana Curve for MTG */}
            {manaCurve && <ManaCurveChart curve={manaCurve} />}

            {/* Main Deck */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Main Deck ({mainDeck.reduce((sum, c) => sum + c.quantity, 0)})
              </Text>
              {mainDeck.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No cards in main deck</Text>
              ) : (
                mainDeck.map((card, idx) => (
                  <View key={`main-${idx}`} style={[styles.deckCardItem, { backgroundColor: colors.surface }]}>
                    {getCardImage(card) ? (
                      <Image source={{ uri: getCardImage(card)! }} style={styles.cardImage} resizeMode="contain" />
                    ) : (
                      <View style={[styles.cardPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                        <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
                      </View>
                    )}
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                        {card.card_data?.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.cardQuantity, { color: colors.textSecondary }]}>x{card.quantity}</Text>
                    </View>
                    {card.is_sideboard && (
                      <View style={[styles.sideboardBadge, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.sideboardText, { color: colors.textSecondary }]}>SB</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Sideboard */}
            {sideboard.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Sideboard ({sideboard.reduce((sum, c) => sum + c.quantity, 0)})
                </Text>
                {sideboard.map((card, idx) => (
                  <View key={`side-${idx}`} style={[styles.deckCardItem, { backgroundColor: colors.surface }]}>
                    {getCardImage(card) ? (
                      <Image source={{ uri: getCardImage(card)! }} style={styles.cardImage} resizeMode="contain" />
                    ) : (
                      <View style={[styles.cardPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                        <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
                      </View>
                    )}
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                        {card.card_data?.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.cardQuantity, { color: colors.textSecondary }]}>x{card.quantity}</Text>
                    </View>
                    <View style={[styles.sideboardBadge, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.sideboardText, { color: colors.textSecondary }]}>SB</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons for adding cards */}
          {isOwner && (
            <View style={[styles.deckActionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.deckActionButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAddCardModal(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.deckActionButtonText}>Add Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deckActionButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setShowImportModal(true)}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.text} />
                <Text style={[styles.deckActionButtonText, { color: colors.text }]}>Import List</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Import Modal */}
          <Modal
            visible={showImportModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowImportModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Import Decklist</Text>
                  <TouchableOpacity onPress={() => setShowImportModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.importHelpText, { color: colors.textSecondary }]}>
                  Paste your decklist in MTGO format:{'\n'}
                  4 Lightning Bolt{'\n'}
                  2 Counterspell{'\n'}
                  Sideboard{'\n'}
                  2 Negate
                </Text>
                
                <TextInput
                  style={[styles.importTextArea, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
                  placeholder="Paste decklist here..."
                  placeholderTextColor={colors.textTertiary}
                  value={importText}
                  onChangeText={setImportText}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
                
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }, (!importText.trim() || importing) && styles.submitButtonDisabled]}
                  onPress={importDecklist}
                  disabled={!importText.trim() || importing}
                >
                  {importing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Import Cards</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Add Card Modal */}
          <Modal
            visible={showAddCardModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowAddCardModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.addCardModalContent, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Add Card</Text>
                  <TouchableOpacity onPress={() => { setShowAddCardModal(false); setCardSearchResults([]); setCardSearchQuery(''); }}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.searchRow, { backgroundColor: colors.surfaceSecondary }]}>
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={`Search ${showDeckDetail?.game === 'mtg' ? 'Magic' : 'Pokemon'} cards...`}
                    placeholderTextColor={colors.textTertiary}
                    value={cardSearchQuery}
                    onChangeText={setCardSearchQuery}
                    onSubmitEditing={searchCards}
                    returnKeyType="search"
                  />
                  <TouchableOpacity onPress={searchCards} style={styles.searchButton}>
                    {searchingCards ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="search" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.searchResults}>
                  {cardSearchResults.map((card, idx) => {
                    const imageUri = showDeckDetail?.game === 'mtg' 
                      ? card.image_uris?.small 
                      : card.image ? `${card.image}/high.webp` : null;
                    
                    return (
                      <View key={idx} style={[styles.searchResultItem, { backgroundColor: colors.surfaceSecondary }]}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.searchResultImage} resizeMode="contain" />
                        ) : (
                          <View style={[styles.searchResultImagePlaceholder, { backgroundColor: colors.background }]}>
                            <Ionicons name="image-outline" size={16} color={colors.textTertiary} />
                          </View>
                        )}
                        <View style={styles.searchResultInfo}>
                          <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
                            {card.name}
                          </Text>
                          <Text style={[styles.searchResultSet, { color: colors.textSecondary }]} numberOfLines={1}>
                            {showDeckDetail?.game === 'mtg' ? card.set_name : card.set?.name || ''}
                          </Text>
                        </View>
                        <View style={styles.addCardButtons}>
                          <TouchableOpacity
                            style={[styles.addCardBtn, { backgroundColor: colors.primary }]}
                            onPress={() => addCardToDeck(card, 1, false)}
                            disabled={addingCard}
                          >
                            <Text style={styles.addCardBtnText}>+1</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.addCardBtn, styles.addSideboardBtn, { backgroundColor: colors.textSecondary }]}
                            onPress={() => addCardToDeck(card, 1, true)}
                            disabled={addingCard}
                          >
                            <Text style={styles.addCardBtnText}>SB</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  {cardSearchResults.length === 0 && cardSearchQuery && !searchingCards && (
                    <Text style={[styles.noResultsText, { color: colors.textTertiary }]}>
                      No cards found. Try a different search.
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </>
    );
  }

  // Decks List View
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>Deck Builder</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{myDecks.length} my decks</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          data-testid="create-deck-btn"
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'my' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('my')}
          data-testid="my-decks-tab"
        >
          <Ionicons name="person-outline" size={18} color={tab === 'my' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'my' && { color: colors.primary }]}>
            My Decks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'community' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('community')}
          data-testid="community-decks-tab"
        >
          <Ionicons name="globe-outline" size={18} color={tab === 'community' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'community' && { color: colors.primary }]}>
            Community
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Game Filter */}
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surfaceSecondary }, gameFilter === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => { setGameFilter('all'); setFormatFilter('all'); }}
          >
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, gameFilter === 'all' && styles.filterChipTextActive]}>All Games</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surfaceSecondary }, gameFilter === 'mtg' && { backgroundColor: colors.primary }]}
            onPress={() => { setGameFilter('mtg'); setFormatFilter('all'); }}
          >
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, gameFilter === 'mtg' && styles.filterChipTextActive]}>MTG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surfaceSecondary }, gameFilter === 'pokemon' && { backgroundColor: colors.primary }]}
            onPress={() => { setGameFilter('pokemon'); setFormatFilter('all'); }}
          >
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, gameFilter === 'pokemon' && styles.filterChipTextActive]}>Pokemon</Text>
          </TouchableOpacity>
          
          {/* Divider */}
          <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />
          
          {/* Format Filters */}
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surfaceSecondary }, formatFilter === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setFormatFilter('all')}
          >
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, formatFilter === 'all' && styles.filterChipTextActive]}>All Formats</Text>
          </TouchableOpacity>
          {getFormats().slice(0, 5).map(format => (
            <TouchableOpacity
              key={format}
              style={[styles.filterChip, { backgroundColor: colors.surfaceSecondary }, formatFilter.toLowerCase() === format.toLowerCase() && { backgroundColor: colors.primary }]}
              onPress={() => setFormatFilter(format)}
            >
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, formatFilter.toLowerCase() === format.toLowerCase() && styles.filterChipTextActive]}>
                {format}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={currentDecks}
          renderItem={renderDeck}
          keyExtractor={(item) => item.deck_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDecks(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {tab === 'my' ? 'No Decks Yet' : 'No Community Decks'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                {tab === 'my' 
                  ? 'Create your first deck to start building'
                  : 'Be the first to share a public deck!'}
              </Text>
              {tab === 'my' && (
                <TouchableOpacity 
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createButtonText}>Create Deck</Text>
                </TouchableOpacity>
              )}
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Deck</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
              placeholder="Deck Name"
              placeholderTextColor={colors.textTertiary}
              value={newDeckName}
              onChangeText={setNewDeckName}
              data-testid="deck-name-input"
            />

            <View style={styles.gameSelector}>
              <TouchableOpacity
                style={[styles.gameOption, { backgroundColor: colors.surfaceSecondary }, newDeckGame === 'mtg' && { backgroundColor: colors.primary }]}
                onPress={() => { setNewDeckGame('mtg'); setNewDeckFormat(''); }}
              >
                <Text style={[styles.gameOptionText, { color: colors.textSecondary }, newDeckGame === 'mtg' && styles.gameOptionTextActive]}>
                  Magic: The Gathering
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameOption, { backgroundColor: colors.surfaceSecondary }, newDeckGame === 'pokemon' && { backgroundColor: colors.primary }]}
                onPress={() => { setNewDeckGame('pokemon'); setNewDeckFormat(''); }}
              >
                <Text style={[styles.gameOptionText, { color: colors.textSecondary }, newDeckGame === 'pokemon' && styles.gameOptionTextActive]}>
                  Pokemon TCG
                </Text>
              </TouchableOpacity>
            </View>

            {/* Format Selection */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Format</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatScroll}>
              {(newDeckGame === 'mtg' ? MTG_FORMATS : POKEMON_FORMATS).map(format => (
                <TouchableOpacity
                  key={format}
                  style={[styles.formatOption, { backgroundColor: colors.surfaceSecondary }, newDeckFormat === format && { backgroundColor: colors.primary }]}
                  onPress={() => setNewDeckFormat(newDeckFormat === format ? '' : format)}
                >
                  <Text style={[styles.formatOptionText, { color: colors.textSecondary }, newDeckFormat === format && styles.formatOptionTextActive]}>
                    {format}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textTertiary}
              value={newDeckDescription}
              onChangeText={setNewDeckDescription}
              multiline
              numberOfLines={3}
            />

            {/* Public Toggle */}
            <TouchableOpacity
              style={[styles.publicToggle, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => setNewDeckPublic(!newDeckPublic)}
            >
              <View style={styles.publicToggleLeft}>
                <Ionicons 
                  name={newDeckPublic ? 'globe' : 'lock-closed'} 
                  size={20} 
                  color={newDeckPublic ? '#10B981' : colors.textSecondary} 
                />
                <Text style={[styles.publicToggleText, { color: colors.text }]}>
                  {newDeckPublic ? 'Public - Visible in Community' : 'Private - Only you can see'}
                </Text>
              </View>
              <View style={[styles.toggleSwitch, newDeckPublic && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, newDeckPublic && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }, (!newDeckName.trim() || creating) && styles.submitButtonDisabled]}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  copyButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  
  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3B82F6' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#3B82F6' },
  
  // Filter Bar
  filterBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#3B82F6' },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterChipTextActive: { color: '#FFFFFF' },
  filterDivider: { width: 1, height: 20, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  
  list: { padding: 16 },
  deckCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  deckHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gameTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  mtgTag: { backgroundColor: '#DBEAFE' },
  pokemonTag: { backgroundColor: '#FEF3C7' },
  gameTagText: { fontSize: 11, fontWeight: '600', color: '#1F2937' },
  formatText: { fontSize: 12, color: '#6B7280' },
  deckName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  deckDescription: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  
  // Author info
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  authorAvatar: { width: 20, height: 20, borderRadius: 10 },
  authorPlaceholder: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 12, color: '#6B7280' },
  
  deckFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cardCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardCountText: { fontSize: 12, color: '#6B7280' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  createButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3B82F6', borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontWeight: '600' },
  
  // Deck Detail
  deckContent: { flex: 1, padding: 16 },
  deckStatsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  deckStat: { flex: 1, alignItems: 'center' },
  deckStatValue: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  deckStatLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  
  // Mana Curve
  manaCurveContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  manaCurveTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  manaCurveChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  manaCurveBar: { alignItems: 'center', width: 36 },
  manaCurveBarFill: { width: 24, backgroundColor: '#3B82F6', borderRadius: 4, marginBottom: 4 },
  manaCurveLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  manaCurveCount: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  deckCardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, marginBottom: 8 },
  cardImage: { width: 40, height: 56, borderRadius: 4 },
  cardPlaceholder: { width: 40, height: 56, borderRadius: 4, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  cardQuantity: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sideboardBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  sideboardText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  addCardNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, gap: 8 },
  addCardNoteText: { flex: 1, fontSize: 13, color: '#6B7280' },
  
  // Deck Action Bar
  deckActionBar: { flexDirection: 'row', padding: 12, gap: 12, borderTopWidth: 1 },
  deckActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  deckActionButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  
  // Import Modal
  importHelpText: { fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  importTextArea: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 14, fontSize: 14, height: 200, textAlignVertical: 'top', marginBottom: 16 },
  
  // Add Card Modal
  addCardModalContent: { maxHeight: '90%' },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  searchButton: { padding: 8 },
  searchResults: { maxHeight: 400 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 8 },
  searchResultImage: { width: 40, height: 56, borderRadius: 4 },
  searchResultImagePlaceholder: { width: 40, height: 56, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  searchResultInfo: { flex: 1, marginLeft: 10 },
  searchResultName: { fontSize: 14, fontWeight: '500' },
  searchResultSet: { fontSize: 12, marginTop: 2 },
  addCardButtons: { flexDirection: 'row', gap: 6 },
  addCardBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addSideboardBtn: { },
  addCardBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  noResultsText: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 14, fontSize: 15, color: '#1F2937', marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  gameSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  gameOption: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  gameOptionActive: { backgroundColor: '#3B82F6' },
  gameOptionText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  gameOptionTextActive: { color: '#FFFFFF' },
  formatScroll: { marginBottom: 12 },
  formatOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 8 },
  formatOptionActive: { backgroundColor: '#3B82F6' },
  formatOptionText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  formatOptionTextActive: { color: '#FFFFFF' },
  publicToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 14, marginBottom: 16 },
  publicToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  publicToggleText: { fontSize: 14, color: '#374151' },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#D1D5DB', padding: 2 },
  toggleSwitchActive: { backgroundColor: '#10B981' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
  submitButton: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { backgroundColor: '#93C5FD' },
  submitButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
