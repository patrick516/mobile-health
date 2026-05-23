import { api } from "../lib/apiClient";
import type { Location, LocationType } from "../types";

export async function fetchLocations(): Promise<Location[]> {
  const [countriesRes] = await Promise.all([
    api.get<{ countries: any[] }>("/admin/locations/countries"),
    Promise.all([]).then(() => ({ districts: [] as any[] })),
  ]);

  const countries = countriesRes.countries ?? [];

  // Fetch districts for each country
  const districtResults = await Promise.all(
    countries.map((c: any) =>
      api
        .get<{ districts: any[] }>(`/admin/locations/districts/${c.code}`)
        .then((r) =>
          r.districts.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: "district" as LocationType,
            parentId: c.code,
            parentName: c.name,
            isActive: true,
          })),
        )
        .catch(() => []),
    ),
  );

  const districts = districtResults.flat();

  // Fetch towns for each district
  const townResults = await Promise.all(
    districts.map((d) =>
      api
        .get<{ towns: any[] }>(`/admin/locations/towns/${d.id}`)
        .then((r) =>
          r.towns.map((t: any) => ({
            id: t.id,
            name: t.name,
            type: "town" as LocationType,
            parentId: d.id,
            parentName: d.name,
            isActive: true,
          })),
        )
        .catch(() => []),
    ),
  );

  const towns = townResults.flat();

  return [...districts, ...towns];
}

export async function createLocation(data: {
  name: string;
  type: LocationType;
  parentId: string | null;
}): Promise<void> {
  if (data.type === "district") {
    await api.post("/admin/locations/districts", {
      name: data.name,
      countryCode: data.parentId,
    });
  } else if (data.type === "town") {
    await api.post("/admin/locations/towns", {
      name: data.name,
      districtId: data.parentId,
    });
  } else {
    await api.post("/admin/locations/countries", {
      code: data.name.slice(0, 2).toUpperCase(),
      name: data.name,
    });
  }
}

export async function updateLocation(
  id: string,
  data: Partial<Location>,
): Promise<void> {
  if (data.type === "district") {
    await api.patch(`/admin/locations/districts/${id}`, { name: data.name });
  } else if (data.type === "town") {
    await api.patch(`/admin/locations/towns/${id}`, { name: data.name });
  }
}

export async function deleteLocation(id: string): Promise<void> {
  await api.delete(`/admin/locations/districts/${id}`);
}
