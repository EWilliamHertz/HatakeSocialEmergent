import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardItemProps {
  card: {
    id: string;
    name: string;
    image_uris?: { small?: string; normal?: string };
    images?: { small?: string };
    set_name?: string;
    rarity?: string;
    prices?: { usd?: string };
    price?: number;
    game?: string;
  };
  quantity?: number;
  showPrice?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export default function CardItem({ card, quantity, showPrice = true, onPress, onLongPress }: CardItemProps) {
  const { colors } = useTheme();
  const imageUrl = card.image_uris?.small || card.image_uris?.normal || card.images?.small || '';
  const price = card.prices?.usd || card.price;

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.surfaceSecondary }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>No Image</Text>
          </View>
        )}
        {quantity && quantity > 1 && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>x{quantity}</Text>
          </View>
        )}
        {card.game && (
          <View style={[styles.gameBadge, card.game === 'pokemon' ? styles.pokemonBadge : styles.mtgBadge]}>
            <Text style={styles.gameBadgeText}>
              {card.game === 'pokemon' ? 'PKM' : 'MTG'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{card.name}</Text>
        {card.set_name && (
          <Text style={[styles.set, { color: colors.textSecondary }]} numberOfLines={1}>{card.set_name}</Text>
        )}
        {showPrice && price && (
          <Text style={[styles.price, { color: colors.success }]}>${typeof price === 'number' ? price.toFixed(2) : price}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.72,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quantityText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  gameBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pokemonBadge: {
    backgroundColor: '#FFCB05',
  },
  mtgBadge: {
    backgroundColor: '#9333EA',
  },
  gameBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  set: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22C55E',
  },
});
