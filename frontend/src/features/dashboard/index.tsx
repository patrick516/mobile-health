import { useEffect, useState } from "react";
import { Card, CardHeader } from "../../components/ui";
import { StatCard } from "../../components/shared/StatCard";
import { SectionHeader } from "../../components/shared/SectionHeader";
import { useDashboard } from "./hooks/useDashboard";
import { MiniChart } from "./components/MiniChart";
import { RecentReports } from "./components/RecentReports";
import { RecentMatches } from "./components/RecentMatches";
import { QuickActions } from "./components/QuickActions";
import {
  fetchRecentReports,
  fetchRecentMatches,
} from "../../services/dashboardService";
import { shortNumber } from "../../lib/utils";

export function DashboardPage() {
  const { stats, loading } = useDashboard();
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentReports().then(setRecentReports).catch(console.error);
    fetchRecentMatches().then(setRecentMatches).catch(console.error);
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-7 grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-purple-50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  // Map backend reports to frontend Report type
  const mappedReports = recentReports.map((r: any) => ({
    id: r.id,
    reporterId: r.submitter?.id ?? "",
    reporterName: r.submitter?.name ?? "Unknown",
    reporterInitials: (r.submitter?.name ?? "?")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    reporterAvatarColor: "linear-gradient(135deg,#c026d3,#7c3aed)",
    reportedUserId: r.subject?.id ?? "",
    reportedUserName: r.subject?.name ?? "Unknown",
    type: r.reason,
    description: r.description ?? "",
    status: r.status,
    adminNotes: r.adminReply ?? null,
    resolvedAt: r.resolvedAt ?? null,
    createdAt: r.createdAt,
  }));

  // Map backend matches to frontend Match type
  const mappedMatches = recentMatches.map((m: any) => ({
    id: m.id,
    user1Id: m.user1?.id ?? "",
    user1Name: m.user1?.name ?? "Unknown",
    user1Initials: (m.user1?.name ?? "?")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    user1AvatarColor: "linear-gradient(135deg,#c026d3,#7c3aed)",
    user2Id: m.user2?.id ?? "",
    user2Name: m.user2?.name ?? "Unknown",
    user2Initials: (m.user2?.name ?? "?")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    user2AvatarColor: "linear-gradient(135deg,#0d9488,#0284c7)",
    type: (m.createdByAdminId ? "manual" : "automatic") as
      | "manual"
      | "automatic",
    status: "active" as "active" | "dissolved",
    locationName:
      [m.user1?.town, m.user1?.district].filter(Boolean).join(", ") || "—",
    createdAt: m.matchedAt,
    dissolvedAt: null,
  }));

  return (
    <div className="p-7 space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={shortNumber(stats.totalUsers)}
          change="8.3% this week"
          changeUp
          icon="👥"
          accent="purple"
        />
        <StatCard
          label="Matches Made"
          value={shortNumber(stats.totalMatches)}
          change="12% this week"
          changeUp
          icon="💞"
          accent="teal"
        />
        <StatCard
          label="Online Now"
          value={shortNumber(stats.onlineNow)}
          change="4.1% yesterday"
          changeUp
          icon="🟢"
          accent="blue"
        />
        <StatCard
          label="Reports Pending"
          value={stats.pendingReports}
          change="3 new today"
          icon="🚩"
          accent="amber"
        />
      </div>

      {/* Chart + Quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card noPad className="xl:col-span-2">
          <CardHeader className="pb-0">
            <div>
              <p className="font-semibold text-gray-900">New Signups</p>
              <p className="text-xs text-gray-400">Last 7 days</p>
            </div>
            <div className="text-right">
              <p
                className="text-2xl font-bold text-gray-900"
                style={{ fontFamily: "Georgia,serif" }}
              >
                {stats.newSignupsToday}
              </p>
              <p className="text-xs text-green-600 font-medium">today</p>
            </div>
          </CardHeader>
          <div className="px-5 py-4">
            <MiniChart values={stats.weeklySignups} />
          </div>
          <div className="grid grid-cols-3 divide-x divide-purple-100 border-t border-purple-100">
            {[
              { label: "This week", value: shortNumber(stats.newSignupsWeek) },
              {
                label: "This month",
                value: shortNumber(stats.newSignupsMonth),
              },
              {
                label: "Reports resolved",
                value: `${stats.reportsResolvedRate}%`,
              },
            ].map((item) => (
              <div key={item.label} className="px-5 py-3 text-center">
                <p
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "Georgia,serif" }}
                >
                  {item.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Quick Actions" />
          <QuickActions
            conversionRate={stats.premiumConversionRate}
            pendingVerifications={stats.pendingVerifications ?? 0}
            pendingReports={stats.pendingReports}
            premiumUsers={stats.premiumUsers}
          />
        </Card>
      </div>

      {/* Reports + Matches */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card noPad>
          <SectionHeader title="Recent Reports" />
          {mappedReports.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No reports yet
            </div>
          ) : (
            <RecentReports reports={mappedReports} />
          )}
        </Card>
        <Card noPad>
          <SectionHeader title="Recent Matches" />
          {mappedMatches.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No matches yet
            </div>
          ) : (
            <RecentMatches matches={mappedMatches} />
          )}
        </Card>
      </div>
    </div>
  );
}
