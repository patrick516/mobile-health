import { useState } from "react";
import { Card, Badge, Button } from "../../components/ui";
import { PageLayout } from "../../components/layout/PageLayout";
import { SectionHeader } from "../../components/shared/SectionHeader";
import { LocationModal } from "./components/LocationModal";
import { useLocations } from "./hooks/useLocations";

export function LocationsPage() {
  const { districts, towns, loading, create } = useLocations();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <PageLayout
        title="Location Management"
        subtitle="Countries, districts, and towns for registration dropdowns"
        action={
          <Button variant="primary" onClick={() => setShowModal(true)}>
            + Add Location
          </Button>
        }
      >
        {loading ? (
          <div className="text-center text-gray-400 py-10 animate-pulse">
            Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Districts */}
            <Card noPad>
              <SectionHeader
                title="Districts"
                action={<Badge variant="gray">{districts.length} active</Badge>}
              />
              {districts.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between px-5 py-3 border-b border-purple-50 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {loc.name}
                    </p>
                    <p className="text-xs text-gray-400">{loc.parentName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Active</Badge>
                    <Button size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </Card>

            {/* Towns */}
            <Card noPad>
              <SectionHeader
                title="Towns"
                action={<Badge variant="gray">{towns.length} active</Badge>}
              />
              {towns.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between px-5 py-3 border-b border-purple-50 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {loc.name}
                    </p>
                    <p className="text-xs text-gray-400">{loc.parentName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Active</Badge>
                    <Button size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </PageLayout>

      <LocationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreate={create}
        districts={districts}
      />
    </>
  );
}
