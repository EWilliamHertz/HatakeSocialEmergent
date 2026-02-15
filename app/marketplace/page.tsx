'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ShoppingBag, MessageCircle } from 'lucide-react';
import Image from 'next/image';

interface Listing {
  listing_id: string;
  card_id: string;
  game: string;
  card_data: any;
  price: number;
  currency: string;
  condition: string;
  foil: boolean;
  quantity: number;
  description: string;
  name: string;
  picture?: string;
  created_at: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        return loadListings();
      })
      .catch(() => router.push('/auth/login'));
  }, [router, filter]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace?game=${filter === 'all' ? '' : filter}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Load listings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCardImage = (listing: Listing) => {
    const card = listing.card_data;
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
              <p className="text-gray-600">Buy and sell cards with the community</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pokemon')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'pokemon' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Pokemon
              </button>
              <button
                onClick={() => setFilter('mtg')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'mtg' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Magic
              </button>
            </div>
          </div>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No listings available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {listings.map((listing) => (
              <div key={listing.listing_id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                <div className="relative aspect-[2/3]">
                  <Image
                    src={getCardImage(listing)}
                    alt={listing.card_data.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {listing.foil && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                      FOIL
                    </div>
                  )}
                  {listing.quantity > 1 && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      x{listing.quantity}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 truncate">{listing.card_data.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{listing.condition}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      ${listing.price.toFixed(2)}
                    </span>
                    <button
                      className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      title="Contact seller"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {listing.picture ? (
                      <Image src={listing.picture} alt={listing.name} width={20} height={20} className="rounded-full" />
                    ) : (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {listing.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-600 truncate">{listing.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
