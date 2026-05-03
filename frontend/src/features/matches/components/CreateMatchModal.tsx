import { useState } from "react";
import { Modal, Button, Input } from "../../../components/ui";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (u1: string, u2: string, notes?: string) => void;
}

export function CreateMatchModal({ open, onClose, onCreate }: Props) {
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = () => {
    onCreate(u1, u2, notes);
    onClose();
    setU1("");
    setU2("");
    setNotes("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="💞 Create Manual Match"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!u1 || !u2}
          >
            💞 Create Match
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 mb-4">
        Manually connect two users who have requested to be matched. Both users
        will be notified.
      </p>
      <div className="space-y-4">
        <Input
          label="User 1 (name or email)"
          value={u1}
          onChange={(e) => setU1(e.target.value)}
          placeholder="Search user…"
        />
        <div className="text-center text-2xl">💜</div>
        <Input
          label="User 2 (name or email)"
          value={u2}
          onChange={(e) => setU2(e.target.value)}
          placeholder="Search user…"
        />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-purple-400 block mb-1">
            Notes (optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Both users requested manual match via support…"
            className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
