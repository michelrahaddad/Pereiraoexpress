/**
 * Calcula o multiplicador de preço baseado na nota do profissional
 * 
 * Lógica:
 * - Nota 0-5: 0.8x (desconto de 20%)
 * - Nota 5.1-8: 1.2x (aumento de 20%)
 * - Nota 8.1-9: 1.3x (aumento de 30%)
 * - Nota 9.1-10: 1.5x (aumento de 50%)
 */
export function getPriceMultiplier(rating: number): number {
  if (rating <= 5) {
    return 0.8;
  } else if (rating <= 8) {
    return 1.2;
  } else if (rating <= 9) {
    return 1.3;
  } else {
    return 1.5;
  }
}

/**
 * Calcula o preço ajustado baseado na nota do profissional
 */
export function getAdjustedPrice(basePrice: number, rating: number): number {
  const multiplier = getPriceMultiplier(rating);
  return Math.round(basePrice * multiplier);
}

/**
 * Retorna o texto descritivo do nível de experiência baseado na nota
 */
export function getRatingLevel(rating: number): string {
  if (rating >= 9.1) {
    return "Premium";
  } else if (rating >= 8.1) {
    return "Experiente";
  } else if (rating >= 5.1) {
    return "Regular";
  } else {
    return "Iniciante";
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
