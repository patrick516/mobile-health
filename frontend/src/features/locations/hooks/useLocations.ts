import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/apiClient";

export interface Country {
  code: string;
  name: string;
  flag: string | null;
}

export interface District {
  id: string;
  name: string;
  countryCode: string;
  countryName?: string;
}

export interface Town {
  id: string;
  name: string;
  districtId: string;
  districtName?: string;
}

export function useLocations() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const countriesRes = await api.get<{ countries: Country[] }>(
        "/admin/locations/countries",
      );
      const allCountries = countriesRes.countries ?? [];
      setCountries(allCountries);

      // Fetch districts for all countries
      const districtResults = await Promise.all(
        allCountries.map((c) =>
          api
            .get<{ districts: any[] }>(`/admin/locations/districts/${c.code}`)
            .then((r) =>
              (r.districts ?? []).map((d: any) => ({
                id: d.id,
                name: d.name,
                countryCode: c.code,
                countryName: c.name,
              })),
            )
            .catch(() => []),
        ),
      );
      const allDistricts = districtResults.flat();
      setDistricts(allDistricts);

      // Fetch towns for all districts
      const townResults = await Promise.all(
        allDistricts.map((d) =>
          api
            .get<{ towns: any[] }>(`/admin/locations/towns/${d.id}`)
            .then((r) =>
              (r.towns ?? []).map((t: any) => ({
                id: t.id,
                name: t.name,
                districtId: d.id,
                districtName: d.name,
              })),
            )
            .catch(() => []),
        ),
      );
      setTowns(townResults.flat());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createCountry = async (name: string, code: string, flag?: string) => {
    await api.post("/admin/locations/countries", { name, code, flag });
    loadAll();
  };

  const createDistrict = async (name: string, countryCode: string) => {
    await api.post("/admin/locations/districts", { name, countryCode });
    loadAll();
  };

  const createTown = async (name: string, districtId: string) => {
    await api.post("/admin/locations/towns", { name, districtId });
    loadAll();
  };

  const deleteCountry = async (code: string) => {
    await api.delete(`/admin/locations/countries/${code}`);
    loadAll();
  };

  const deleteDistrict = async (id: string) => {
    await api.delete(`/admin/locations/districts/${id}`);
    loadAll();
  };

  const deleteTown = async (id: string) => {
    await api.delete(`/admin/locations/towns/${id}`);
    loadAll();
  };

  return {
    countries,
    districts,
    towns,
    loading,
    createCountry,
    createDistrict,
    createTown,
    deleteCountry,
    deleteDistrict,
    deleteTown,
    reload: loadAll,
  };
}
