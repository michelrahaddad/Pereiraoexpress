const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface GeocodingResult {
  latitude: number;
  longitude: number;
}

export async function geocodeCity(city: string, state?: string): Promise<GeocodingResult | null> {
  try {
    let query = city;
    if (state) {
      query = `${city}, ${state}, Brazil`;
    } else if (city.includes(" - ")) {
      const [c, s] = city.split(" - ");
      query = `${c}, ${s}, Brazil`;
    } else {
      query = `${city}, Brazil`;
    }

    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "br",
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        "User-Agent": "PeiraoExpress/1.0",
        "Accept-Language": "pt-BR",
      },
    });

    if (!response.ok) return null;

    const results = await response.json();
    if (results.length > 0) {
      return {
        latitude: parseFloat(results[0].lat),
        longitude: parseFloat(results[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function geocodeCep(cep: string): Promise<GeocodingResult & { city?: string; state?: string } | null> {
  try {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;

    const viacepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!viacepRes.ok) return null;

    const viacepData = await viacepRes.json();
    if (viacepData.erro) return null;

    const city = viacepData.localidade;
    const state = viacepData.uf;

    const coords = await geocodeCity(city, state);
    if (coords) {
      return {
        ...coords,
        city,
        state,
      };
    }
    return null;
  } catch (error) {
    console.error("CEP geocoding error:", error);
    return null;
  }
}
