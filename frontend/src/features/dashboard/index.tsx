import { Card, CardHeader } from "../../components/ui";
import { StatCard } from "../../components/shared/StatCard";
import { SectionHeader } from "../../components/shared/SectionHeader";
import { useDashboard } from "./hooks/useDashboard";
import { MiniChart } from "./components/MiniChart";
import { RecentReports } from "./components/RecentReports";
import { RecentMatches } from "./components/RecentMatches";
import { QuickActions } from "./components/QuickActions";
import { MOCK_REPORTS, MOCK_MATCHES } from "../../lib/mockData";
import { shortNumber } from "../../lib/utils";

export function DashboardPage() {
  const { stats, loading } = useDashboard();

  if (loading || !stats) {
    return (
      <div className="p-7 grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-purple-50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

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
          <QuickActions conversionRate={stats.premiumConversionRate} />
        </Card>
      </div>

      {/* Reports + Matches */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card noPad>
          <SectionHeader title="Recent Reports" />
          <RecentReports reports={MOCK_REPORTS} />
        </Card>
        <Card noPad>
          <SectionHeader title="Recent Matches" />
          <RecentMatches matches={MOCK_MATCHES} />
        </Card>
      </div>
    </div>
  );
}
