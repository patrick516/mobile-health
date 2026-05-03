import { useState } from "react";
import { Modal, Button, Input, Select } from "../../../components/ui";
import type { Location, LocationType } from "../../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    type: LocationType;
    parentId: string | null;
  }) => void;
  districts: Location[];
}

export function LocationModal({ open, onClose, onCreate, districts }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<LocationType>("district");
  const [parentId, setParentId] = useState<string | null>(null);

  const handleCreate = () => {
    onCreate({ name, type, parentId });
    onClose();
    setName("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="📍 Add Location"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={!name}>
            + Add Location
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as LocationType)}
        >
          <option value="district">District</option>
          <option value="town">Town</option>
          <option value="country">Country</option>
        </Select>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Location name…"
        />
        {type === "town" && (
          <Select
            label="Parent District"
            value={parentId ?? ""}
            onChange={(e) => setParentId(e.target.value || null)}
          >
            <option value="">— Select district —</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
      </div>
    </Modal>
  );
}
