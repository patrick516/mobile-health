import { useState } from "react";
import { Card, Badge, Button } from "../../components/ui";
import { PageLayout } from "../../components/layout/PageLayout";
import { SectionHeader } from "../../components/shared/SectionHeader";
import { LocationModal } from "./components/LocationModal";
import { useLocations } from "./hooks/useLocations";

type ModalType = "country" | "district" | "town";

export function LocationsPage() {
  const {
    countries,
    districts,
    towns,
    loading,
    createCountry,
    createDistrict,
    createTown,
    deleteDistrict,
    deleteTown,
  } = useLocations();

  const [modalType, setModalType] = useState<ModalType>("country");
  const [showModal, setShowModal] = useState(false);

  const openModal = (type: ModalType) => {
    setModalType(type);
    setShowModal(true);
  };

  return (
    <>
      <PageLayout
        title="Location Management"
        subtitle="Countries, districts, and towns for registration dropdowns"
      >
        {loading ? (
          <div className="text-center text-gray-400 py-10 animate-pulse">
            Loading…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Countries */}
            <Card noPad>
              <SectionHeader
                title="Countries"
                action={
                  <div className="flex items-center gap-2">
                    <Badge variant="gray">{countries.length} active</Badge>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openModal("country")}
                    >
                      + Add Country
                    </Button>
                  </div>
                }
              />
              {countries.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No countries yet. Add one to get started.
                </div>
              ) : (
                countries.map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center justify-between px-5 py-3 border-b border-purple-50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {c.flag} {c.name}
                      </p>
                      <p className="text-xs text-gray-400">Code: {c.code}</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))
              )}
            </Card>

            {/* Districts */}
            <Card noPad>
              <SectionHeader
                title="Districts"
                action={
                  <div className="flex items-center gap-2">
                    <Badge variant="gray">{districts.length} active</Badge>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openModal("district")}
                      disabled={countries.length === 0}
                    >
                      + Add District
                    </Button>
                  </div>
                }
              />
              {districts.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No districts yet. Add a country first.
                </div>
              ) : (
                districts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-5 py-3 border-b border-purple-50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {d.name}
                      </p>
                      <p className="text-xs text-gray-400">{d.countryName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Active</Badge>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteDistrict(d.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </Card>

            {/* Towns */}
            <Card noPad>
              <SectionHeader
                title="Towns"
                action={
                  <div className="flex items-center gap-2">
                    <Badge variant="gray">{towns.length} active</Badge>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openModal("town")}
                      disabled={districts.length === 0}
                    >
                      + Add Town
                    </Button>
                  </div>
                }
              />
              {towns.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No towns yet. Add a district first.
                </div>
              ) : (
                towns.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-5 py-3 border-b border-purple-50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-400">{t.districtName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Active</Badge>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteTown(t.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}
      </PageLayout>

      <LocationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        type={modalType}
        countries={countries}
        districts={districts}
        onCreateCountry={createCountry}
        onCreateDistrict={createDistrict}
        onCreateTown={createTown}
      />
    </>
  );
}
