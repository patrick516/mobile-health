import { useState } from "react";
import { Modal, Button, Select } from "../../../components/ui";
import { REPORT_TYPE_LABELS } from "../../../lib/constants";
import { timeAgo } from "../../../lib/utils";
import type { Report } from "../../../types";

const ACTIONS = [
  "",
  "Remove photo only",
  "Warn user",
  "Suspend user (7 days)",
  "Permanent ban",
  "No action — mark resolved",
];

interface Props {
  report: Report | null;
  onClose: () => void;
  onResolve: (
    id: string,
    payload: { adminNotes: string; replyEmail: string; action: string },
  ) => void;
  onDismiss: (id: string) => void;
}

export function ReportModal({ report, onClose, onResolve, onDismiss }: Props) {
  const [adminNotes, setAdminNotes] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [action, setAction] = useState("");
  if (!report) return null;

  const handleResolve = () => {
    onResolve(report.id, { adminNotes, replyEmail, action });
    onClose();
  };

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title="🚩 Review Report"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onDismiss(report.id);
              onClose();
            }}
          >
            Dismiss
          </Button>
          <Button variant="primary" onClick={handleResolve}>
            Resolve & Send Reply
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          {
            label: "Reporter",
            name: report.reporterName,
            color: report.reporterAvatarColor,
            initials: report.reporterInitials,
          },
          {
            label: "Reported",
            name: report.reportedUserName,
            color: "linear-gradient(135deg,#6b7280,#9ca3af)",
            initials: "?",
          },
        ].map((p) => (
          <div key={p.label} className="bg-purple-50 p-3 rounded-xl">
            <p className="text-[10px] uppercase font-semibold text-purple-400 mb-2">
              {p.label}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: p.color }}
              >
                {p.initials}
              </div>
              <p className="font-medium text-sm text-gray-800">{p.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
          Type
        </p>
        <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-2 py-1 rounded-full">
          {REPORT_TYPE_LABELS[report.type]}
        </span>
        <p className="text-xs text-gray-400 mt-0.5">
          {timeAgo(report.createdAt)}
        </p>
      </div>

      <div className="bg-purple-50 p-3 rounded-xl mb-4 text-sm text-gray-600 leading-relaxed italic">
        "{report.description}"
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-purple-400 block mb-1">
            Admin Notes
          </label>
          <textarea
            rows={2}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes…"
            className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-purple-400 block mb-1">
            Reply to Reporter via Email
          </label>
          <textarea
            rows={3}
            value={replyEmail}
            onChange={(e) => setReplyEmail(e.target.value)}
            placeholder="e.g. Thank you for your report. We have reviewed the content and taken appropriate action…"
            className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 resize-none"
          />
        </div>
        <Select
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a || "Select action…"}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
