/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lon1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lon2 Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Distância máxima para exibir prestadores (em km)
 */
export const MAX_PROVIDER_DISTANCE_KM = 30;

/**
 * Filtra prestadores por distância do cliente
 */
export function filterProvidersByDistance<T extends { latitude?: string | null; longitude?: string | null }>(
  providers: T[],
  clientLat: number,
  clientLon: number,
  maxDistanceKm: number = MAX_PROVIDER_DISTANCE_KM
): (T & { distance: number })[] {
  return providers
    .filter(provider => provider.latitude && provider.longitude)
    .map(provider => ({
      ...provider,
      distance: calculateDistance(
        clientLat,
        clientLon,
        parseFloat(provider.latitude!),
        parseFloat(provider.longitude!)
      )
    }))
    .filter(provider => provider.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance);
}
