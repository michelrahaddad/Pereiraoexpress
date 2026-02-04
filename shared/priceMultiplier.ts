/**
 * Calcula o multiplicador de preço baseado na nota do profissional
 * 
 * Lógica:
 * - Profissional novo (sem avaliações): 1.0x (preço base)
 * - Nota 0-5: 0.8x Iniciante (desconto de 20%)
 * - Nota 5.1-7.9: 1.2x Regular (aumento de 20%)
 * - Nota 8-8.9: 1.3x Experiente (aumento de 30%)
 * - Nota 9-10: 1.5x Premium (aumento de 50%)
 */
export function getPriceMultiplier(rating: number, totalRatings: number = 0): number {
  // Profissionais novos (sem avaliações) usam preço base
  if (totalRatings === 0) {
    return 1.0;
  }
  
  if (rating <= 5) {
    return 0.8;
  } else if (rating < 8) {
    return 1.2;
  } else if (rating < 9) {
    return 1.3;
  } else {
    return 1.5; // 9-10 = Premium
  }
}

/**
 * Calcula o preço ajustado baseado na nota do profissional
 */
export function getAdjustedPrice(basePrice: number, rating: number, totalRatings: number = 0): number {
  const multiplier = getPriceMultiplier(rating, totalRatings);
  return Math.round(basePrice * multiplier);
}

/**
 * Retorna o texto descritivo do nível de experiência baseado na nota
 */
export function getRatingLevel(rating: number, totalRatings: number = 0): string {
  if (totalRatings === 0) {
    return "Novo";
  }
  if (rating >= 9) {
    return "Premium"; // 9-10
  } else if (rating >= 8) {
    return "Experiente"; // 8-8.9
  } else if (rating > 5) {
    return "Regular"; // 5.1-7.9
  } else {
    return "Iniciante"; // 0-5
  }
}

/**
 * Calcula a nova média de rating após uma nova avaliação
 */
export function calculateNewRating(
  currentRating: number,
  totalRatings: number,
  newRating: number
): number {
  const totalSum = currentRating * totalRatings + newRating;
  const newAverage = totalSum / (totalRatings + 1);
  return Math.round(newAverage * 10) / 10; // Arredonda para 1 casa decimal
}
