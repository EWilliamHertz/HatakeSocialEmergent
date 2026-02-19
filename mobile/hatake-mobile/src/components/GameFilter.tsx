import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface GameFilterProps {
  selected: 'all' | 'mtg' | 'pokemon';
  onSelect: (game: 'all' | 'mtg' | 'pokemon') => void;
}

export default function GameFilter({ selected, onSelect }: GameFilterProps) {
  const options: { key: 'all' | 'mtg' | 'pokemon'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mtg', label: 'Magic' },
    { key: 'pokemon', label: 'Pokémon' },
  ];

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.option,
            selected === option.key && styles.selectedOption,
          ]}
          onPress={() => onSelect(option.key)}
        >
          <Text
            style={[
              styles.optionText,
              selected === option.key && styles.selectedText,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#3B82F6',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedText: {
    color: '#fff',
  },
});
