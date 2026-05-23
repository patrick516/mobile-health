import { useState } from "react";
import { Modal, Button, Input, Select } from "../../../components/ui";

type ModalType = "country" | "district" | "town";

interface Props {
  open: boolean;
  onClose: () => void;
  type: ModalType;
  countries: { code: string; name: string }[];
  districts: { id: string; name: string; countryCode: string }[];
  onCreateCountry: (name: string, code: string, flag?: string) => void;
  onCreateDistrict: (name: string, countryCode: string) => void;
  onCreateTown: (name: string, districtId: string) => void;
}

export function LocationModal({
  open,
  onClose,
  type,
  countries,
  districts,
  onCreateCountry,
  onCreateDistrict,
  onCreateTown,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [flag, setFlag] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [districtId, setDistrictId] = useState("");

  const filteredDistricts = countryCode
    ? districts.filter((d) => d.countryCode === countryCode)
    : districts;

  const isValid = () => {
    if (!name.trim()) return false;
    if (type === "country" && !code.trim()) return false;
    if (type === "district" && !countryCode) return false;
    if (type === "town" && !districtId) return false;
    return true;
  };

  const handleCreate = () => {
    if (!isValid()) return;
    if (type === "country")
      onCreateCountry(
        name.trim(),
        code.trim().toUpperCase(),
        flag || undefined,
      );
    if (type === "district") onCreateDistrict(name.trim(), countryCode);
    if (type === "town") onCreateTown(name.trim(), districtId);
    setName("");
    setCode("");
    setFlag("");
    setCountryCode("");
    setDistrictId("");
    onClose();
  };

  const titles = {
    country: "🌍 Add Country",
    district: "🏙️ Add District",
    town: "📌 Add Town",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titles[type]}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!isValid()}
          >
            + Add {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            type === "country"
              ? "e.g. Malawi"
              : type === "district"
                ? "e.g. Blantyre"
                : "e.g. Limbe"
          }
        />

        {type === "country" && (
          <>
            <Input
              label="Country Code (2 letters)"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="e.g. MW"
            />
            <Input
              label="Flag Emoji (optional)"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="e.g. 🇲🇼"
            />
          </>
        )}

        {type === "district" && (
          <Select
            label="Country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            <option value="">— Select country —</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        )}

        {type === "town" && (
          <>
            <Select
              label="Country"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setDistrictId("");
              }}
            >
              <option value="">— Select country first —</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="District"
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              disabled={!countryCode}
            >
              <option value="">— Select district —</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>
    </Modal>
  );
}
