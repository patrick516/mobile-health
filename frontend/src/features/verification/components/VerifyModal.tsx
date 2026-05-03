import { useState } from "react";
import { Modal, Button, Select } from "../../../components/ui";
import { Avatar } from "../../../components/ui";
import { formatDate, timeAgo } from "../../../lib/utils";
import { DOCUMENT_TYPE_LABELS } from "../../../lib/constants";
import type { User } from "../../../types";

interface Props {
  user: User | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

const REJECT_REASONS = [
  "",
  "Document is expired",
  "Photo does not match ID",
  "Document is not readable",
  "Wrong document type submitted",
];

export function VerifyModal({ user, onClose, onApprove, onReject }: Props) {
  const [rejectReason, setRejectReason] = useState("");
  if (!user) return null;

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`✅ Verify Identity — ${user.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onReject(user.id, rejectReason);
              onClose();
            }}
            disabled={!rejectReason}
          >
            ✗ Reject
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApprove(user.id);
              onClose();
            }}
          >
            ✅ Approve & Verify
          </Button>
        </>
      }
    >
      {/* User info */}
      <div className="flex gap-4 mb-5">
        <Avatar initials={user.initials} color={user.avatarColor} size="lg" />
        <div>
          <h3 className="font-semibold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-400">
            {user.gender === "female" ? "F" : "M"}, {user.age} ·{" "}
            {user.locationName}
          </p>
          <div className="grid grid-cols-2 gap-x-6 mt-2">
            {[
              ["Email", user.email],
              ["Joined", formatDate(user.joinedAt)],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <span className="text-xs text-gray-400">{k}</span>
                <p className="text-xs font-medium text-gray-800">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Profile Photos
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {user.photos.map((p) => (
            <div
              key={p.id}
              className="aspect-square rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl relative group"
            >
              🤳
              {p.isMain && (
                <span className="absolute bottom-1 left-1 text-[9px] bg-fuchsia-600 text-white px-1 py-0.5 rounded font-bold">
                  Main
                </span>
              )}
              <button className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center">
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Submitted Documents
        </p>
        {user.documents.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 p-3 border border-purple-100 rounded-lg mb-1.5 hover:border-fuchsia-300 cursor-pointer"
          >
            <span className="text-2xl">🪪</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{d.filename}</p>
              <p className="text-xs text-gray-400">
                {DOCUMENT_TYPE_LABELS[d.type]} · {d.fileSizeMb} MB ·{" "}
                {timeAgo(d.uploadedAt)}
              </p>
            </div>
            <Button size="sm">👁 View</Button>
          </div>
        ))}
      </div>

      {/* Reject reason */}
      <Select
        label="Rejection Reason (required to reject)"
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
      >
        {REJECT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r || "Select reason…"}
          </option>
        ))}
      </Select>
    </Modal>
  );
}
