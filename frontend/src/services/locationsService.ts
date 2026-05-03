import { delay } from "../lib/utils";
import { MOCK_LOCATIONS } from "../lib/mockData";
import type { Location, LocationType } from "../types";

export async function fetchLocations(): Promise<Location[]> {
  await delay(300);
  return MOCK_LOCATIONS;
  // REAL: return api.get<Location[]>('/admin/locations');
}

export async function createLocation(data: {
  name: string;
  type: LocationType;
  parentId: string | null;
}): Promise<void> {
  await delay(300);
  MOCK_LOCATIONS.push({ id: `l${Date.now()}`, ...data, isActive: true });
  // REAL: return api.post('/admin/locations', data);
}

export async function updateLocation(
  id: string,
  data: Partial<Location>,
): Promise<void> {
  await delay(300);
  const loc = MOCK_LOCATIONS.find((l) => l.id === id);
  if (loc) Object.assign(loc, data);
  // REAL: return api.put(`/admin/locations/${id}`, data);
}

export async function deleteLocation(id: string): Promise<void> {
  await delay(300);
  const idx = MOCK_LOCATIONS.findIndex((l) => l.id === id);
  if (idx > -1) MOCK_LOCATIONS.splice(idx, 1);
  // REAL: return api.delete(`/admin/locations/${id}`);
}
