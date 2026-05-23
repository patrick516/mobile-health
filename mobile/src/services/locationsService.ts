import apiClient from "../lib/apiClient";

export interface Country {
  code: string;
  name: string;
  flag: string | null;
}

export interface District {
  id: string;
  name: string;
  countryCode: string;
}

export interface Town {
  id: string;
  name: string;
  districtId: string;
}

export async function fetchCountries(): Promise<Country[]> {
  const res = await apiClient.get("/mobile/locations/countries");
  return res.data.countries ?? [];
}

export async function fetchDistricts(countryCode: string): Promise<District[]> {
  const res = await apiClient.get(`/mobile/locations/districts/${countryCode}`);
  return res.data.districts ?? [];
}

export async function fetchTowns(districtId: string): Promise<Town[]> {
  const res = await apiClient.get(`/mobile/locations/towns/${districtId}`);
  return res.data.towns ?? [];
}
