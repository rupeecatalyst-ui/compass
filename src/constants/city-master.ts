import { CITY_MASTER_SEED, type CityMasterEntry } from "@/data/catalyst-one/city-master-seed";

export type { CityMasterEntry };

export function searchCities(query: string): CityMasterEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITY_MASTER_SEED;
  return CITY_MASTER_SEED.filter(
    (entry) =>
      entry.city.toLowerCase().includes(q) ||
      entry.state.toLowerCase().includes(q),
  );
}

export function findCityEntry(city?: string, state?: string): CityMasterEntry | undefined {
  if (!city) return undefined;
  const normalized = city.trim().toLowerCase();
  return CITY_MASTER_SEED.find(
    (entry) =>
      entry.city.toLowerCase() === normalized &&
      (!state || entry.state.toLowerCase() === state.trim().toLowerCase()),
  );
}

export function getCityLabel(city?: string, state?: string): string | undefined {
  if (!city) return undefined;
  const match = findCityEntry(city, state);
  return match ? `${match.city}, ${match.state}` : state ? `${city}, ${state}` : city;
}
