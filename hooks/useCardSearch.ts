// hooks/useCardSearch.ts

// Temporary stub options to allow Vercel to build successfully
export const pokemonFinishOptions = ['Normal', 'Holo', 'Reverse Holo'];
export const lorcanaFinishOptions = ['Normal', 'Foil'];
export const mtgFinishOptions = ['Non-foil', 'Foil', 'Etched'];

export const conditionOptions = [
  'Near Mint', 
  'Lightly Played', 
  'Moderately Played', 
  'Heavily Played', 
  'Damaged'
];

export const gradingCompanies = ['PSA', 'BGS', 'CGC', 'None'];
export const gradeValues = ['10', '9.5', '9', '8.5', '8', '7', '6', '5', '4', '3', '2', '1'];

// Corrected stub function to match AddCardModal's expectations
export function getPriceForFinish(
  card: any, 
  game: string, 
  finish: string
): { currency: string; value: number } | null {
  if (!card || !card.prices) return null;
  
  // Very basic fallback logic for the stub
  const val = card.prices[finish.toLowerCase()] || card.prices.usd || 0;
  
  if (val > 0) {
    return {
      currency: 'USD',
      value: val
    };
  }
  
  return null;
}

// Temporary stub hook
export function useCardSearch() {
  return {
    searchCards: async () => [],
    loading: false,
    results: []
  };
}