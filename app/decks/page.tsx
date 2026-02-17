'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Plus, Search, Layers, Trash2, Globe, Lock, ChevronRight, Loader2, Users, User, Filter } from 'lucide-react';
import Link from 'next/link';

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
  user_id?: string;
  user_name?: string;
  user_picture?: string;
}

export default function DecksPage() {
  const router = useRouter();
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [communityDecks, setCommunityDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [newDeckGame, setNewDeckGame] = useState('mtg');
  const [newDeckFormat, setNewDeckFormat] = useState('');
  const [newDeckPublic, setNewDeckPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filters for community decks
  const [filterGame, setFilterGame] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const mtgFormats = ['Standard', 'Modern', 'Legacy', 'Vintage', 'Pioneer', 'Commander', 'Pauper', 'Draft', 'Sealed'];
  const pokemonFormats = ['Standard', 'Expanded', 'Legacy', 'Unlimited'];
  const allFormats = [...new Set([...mtgFormats, ...pokemonFormats])];

  const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUserId(data.user.user_id);
          setIsAdmin(ADMIN_EMAILS.includes(data.user.email) || data.user.is_admin);
          loadDecks();
          loadCommunityDecks();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadDecks = async () => {
    try {
      const res = await fetch('/api/decks', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMyDecks(data.decks || []);
      }
    } catch (error) {
      console.error('Load decks error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityDecks = async () => {
    try {
      const params = new URLSearchParams();
      params.set('public', 'true');
      if (filterGame !== 'all') params.set('game', filterGame);
      if (filterFormat !== 'all') params.set('format', filterFormat);
      if (searchQuery) params.set('search', searchQuery);
      
      const res = await fetch(`/api/decks/community?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCommunityDecks(data.decks || []);
      }
    } catch (error) {
      console.error('Load community decks error:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      loadCommunityDecks();
    }
  }, [filterGame, filterFormat, searchQuery, activeTab]);

  const createDeck = async () => {
    if (!newDeckName.trim()) return;
    setCreating(true);
    
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newDeckName,
          description: newDeckDescription,
          game: newDeckGame,
          format: newDeckFormat,
          isPublic: newDeckPublic
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewDeckName('');
        setNewDeckDescription('');
        setNewDeckFormat('');
        setNewDeckPublic(false);
        router.push(`/decks/${data.deckId}`);
      }
    } catch (error) {
      console.error('Create deck error:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteDeck = async (deckId: string, isCommunityDeck: boolean = false) => {
    const confirmMsg = isCommunityDeck 
      ? 'Are you sure you want to delete this community deck? This action cannot be undone.'
      : 'Are you sure you want to delete this deck?';
    if (!confirm(confirmMsg)) return;
    
    try {
      const res = await fetch(`/api/decks/${deckId}${isAdmin ? '?admin=true' : ''}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        if (isCommunityDeck) {
          loadCommunityDecks();
        } else {
          loadDecks();
        }
      } else {
        alert(data.error || 'Failed to delete deck');
      }
    } catch (error) {
      console.error('Delete deck error:', error);
    }
  };

  const displayedDecks = activeTab === 'my' ? myDecks : communityDecks;

  const DeckCard = ({ deck, showOwner = false, canDelete = false }: { deck: Deck; showOwner?: boolean; canDelete?: boolean }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition group">
      <Link href={`/decks/${deck.deck_id}`} className="block p-6" data-testid={`deck-${deck.deck_id}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              deck.game === 'mtg' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
            }`}>
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition">{deck.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{deck.game.toUpperCase()} {deck.format && `• ${deck.format}`}</p>
            </div>
          </div>
          {deck.is_public ? (
            <span title="Public"><Globe className="w-5 h-5 text-green-500" /></span>
          ) : (
            <span title="Private"><Lock className="w-5 h-5 text-gray-400" /></span>
          )}
        </div>
        
        {deck.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{deck.description}</p>
        )}
        
        {showOwner && deck.user_name && (
          <div className="flex items-center gap-2 mb-3">
            {deck.user_picture ? (
              <img src={deck.user_picture} alt={deck.user_name} className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                {deck.user_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">{deck.user_name}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {Number(deck.card_count)} cards
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            Updated {new Date(deck.updated_at).toLocaleDateString()}
          </span>
        </div>
      </Link>
      
      <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-3 flex justify-between items-center">
        <Link
          href={`/decks/${deck.deck_id}`}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {canDelete ? 'Edit Deck' : 'View Deck'}
          <ChevronRight className="w-4 h-4" />
        </Link>
        {canDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              deleteDeck(deck.deck_id);
            }}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            title="Delete Deck"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deck Builder</h1>
            <p className="text-gray-600 dark:text-gray-400">Create and manage your TCG decks</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            data-testid="create-deck-btn"
          >
            <Plus className="w-5 h-5" />
            Create Deck
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'my'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="my-decks-tab"
          >
            <User className="w-5 h-5" />
            My Decks
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'my' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {myDecks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'community'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="community-decks-tab"
          >
            <Users className="w-5 h-5" />
            Community Decks
          </button>
        </div>

        {/* Filters (Community tab only) */}
        {activeTab === 'community' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filters:</span>
              </div>
              
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search decks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="deck-search-input"
                />
              </div>
              
              {/* Game Filter */}
              <select
                value={filterGame}
                onChange={(e) => {
                  setFilterGame(e.target.value);
                  setFilterFormat('all');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="game-filter"
              >
                <option value="all">All Games</option>
                <option value="mtg">Magic: The Gathering</option>
                <option value="pokemon">Pokemon TCG</option>
              </select>
              
              {/* Format Filter */}
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="format-filter"
              >
                <option value="all">All Formats</option>
                {(filterGame === 'mtg' ? mtgFormats : filterGame === 'pokemon' ? pokemonFormats : allFormats).map((format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Decks Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : displayedDecks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {activeTab === 'my' ? 'No decks yet' : 'No community decks found'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {activeTab === 'my' 
                ? 'Start building your first deck!'
                : 'Try adjusting your filters or check back later'}
            </p>
            {activeTab === 'my' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Create Your First Deck
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedDecks.map((deck) => (
              <DeckCard 
                key={deck.deck_id} 
                deck={deck} 
                showOwner={activeTab === 'community'}
                canDelete={activeTab === 'my' || deck.user_id === currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Deck</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deck Name</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="My Awesome Deck"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="deck-name-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Describe your deck..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game</label>
                <select
                  value={newDeckGame}
                  onChange={(e) => {
                    setNewDeckGame(e.target.value);
                    setNewDeckFormat('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mtg">Magic: The Gathering</option>
                  <option value="pokemon">Pokemon TCG</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format (optional)</label>
                <select
                  value={newDeckFormat}
                  onChange={(e) => setNewDeckFormat(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Format</option>
                  {(newDeckGame === 'mtg' ? mtgFormats : pokemonFormats).map((format) => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newDeckPublic}
                  onChange={(e) => setNewDeckPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
                  Make this deck public (others can view it)
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={createDeck}
                disabled={!newDeckName.trim() || creating}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                data-testid="create-deck-submit"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Deck
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
