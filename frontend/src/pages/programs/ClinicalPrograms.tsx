import { useState } from "react";
import { Stethoscope, Shield, Baby, Pill, HeartHandshake } from "lucide-react";

import ReferralQueue from "../referrals/ReferralQueue";
import ImmunisationTracker from "../immunisations/ImmunisationTracker";
import PncTracker from "../pnc/PncTracker";
import TbTracker from "../tb/TbTracker";
import FpTracker from "../fp/FpTracker";

export default function ClinicalPrograms() {
  const [activeTab, setActiveTab] = useState<
    "referrals" | "immunisations" | "pnc" | "tb" | "fp"
  >("referrals");

  const TABS = [
    { id: "referrals", label: "Referrals", icon: Stethoscope },
    { id: "immunisations", label: "Immunisations", icon: Shield },
    { id: "pnc", label: "Postnatal Care (PNC)", icon: Baby },
    { id: "tb", label: "TB Follow-up", icon: Pill },
    { id: "fp", label: "Family Planning", icon: HeartHandshake },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto no-scrollbar shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-teal-600 text-teal-700 bg-teal-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "referrals" && <ReferralQueue />}
        {activeTab === "immunisations" && <ImmunisationTracker />}
        {activeTab === "pnc" && <PncTracker />}
        {activeTab === "tb" && <TbTracker />}
        {activeTab === "fp" && <FpTracker />}
      </div>
    </div>
  );
}
