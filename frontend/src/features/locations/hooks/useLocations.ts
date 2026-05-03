import { useState, useEffect, useCallback } from "react";
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../../../services/locationsService";
import type { Location, LocationType } from "../../../types";

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchLocations()
      .then(setLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: {
    name: string;
    type: LocationType;
    parentId: string | null;
  }) => {
    await createLocation(data);
    load();
  };
  const update = async (id: string, data: Partial<Location>) => {
    await updateLocation(id, data);
    load();
  };
  const remove = async (id: string) => {
    await deleteLocation(id);
    load();
  };

  const districts = locations.filter((l) => l.type === "district");
  const towns = locations.filter((l) => l.type === "town");

  return {
    locations,
    districts,
    towns,
    loading,
    create,
    update,
    remove,
    reload: load,
  };
}
