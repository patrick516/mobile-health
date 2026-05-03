import { StatCard } from "../../components/shared/StatCard";
import { Card } from "../../components/ui";
import { PageLayout } from "../../components/layout/PageLayout";
import { SectionHeader } from "../../components/shared/SectionHeader";
import { useAnalytics } from "./hooks/useAnalytics";
import { shortNumber } from "../../lib/utils";

const CHART_MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

const METRIC_COLORS = [
  "from-fuchsia-500 to-violet-500",
  "from-teal-500 to-blue-500",
  "from-amber-500 to-yellow-400",
  "from-green-500 to-emerald-400",
];

export function AnalyticsPage() {
  const { analytics, loading } = useAnalytics();

  if (loading || !analytics) {
    return (
      <div className="p-7 grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-purple-50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const max = Math.max(...analytics.monthlySignups, 1);

  const metrics = [
    {
      label: "Premium conversion",
      value: analytics.keyMetrics.premiumConversion,
    },
    {
      label: "Identity verified",
      value: analytics.keyMetrics.identityVerified,
    },
    {
      label: "Profile completion",
      value: analytics.keyMetrics.profileCompletion,
    },
    { label: "Reports resolved", value: analytics.keyMetrics.reportsResolved },
  ];

  return (
    <PageLayout title="Analytics" subtitle="Platform performance overview">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total Users"
          value={shortNumber(analytics.totalUsers)}
          change="8.3%"
          changeUp
          accent="purple"
          icon="👥"
        />
        <StatCard
          label="Messages Sent"
          value={shortNumber(analytics.totalMessages)}
          change="14%"
          changeUp
          accent="teal"
          icon="💬"
        />
        <StatCard
          label="Premium Rate"
          value={`${analytics.premiumRate}%`}
          change="2.1%"
          changeUp
          accent="blue"
          icon="💎"
        />
        <StatCard
          label="Reports Resolved"
          value={`${analytics.reportsResolvedRate}%`}
          change="1%"
          changeUp
          accent="amber"
          icon="✅"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Growth chart */}
        <Card>
          <SectionHeader title="User Growth (6 months)" />
          <div className="mt-4 flex items-end gap-2 h-28">
            {analytics.monthlySignups.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className={`rounded-t-sm ${i === analytics.monthlySignups.length - 1 ? "bg-gradient-to-t from-fuchsia-600 to-violet-400" : "bg-purple-100"}`}
                  style={{ height: `${(v / max) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {CHART_MONTHS.map((m) => (
              <span
                key={m}
                className="flex-1 text-center text-[11px] text-gray-400"
              >
                {m}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            {[
              [
                "New signups this month",
                shortNumber(analytics.newSignupsMonth),
              ],
              ["Active users (30d)", shortNumber(analytics.activeUsers30d)],
              ["Churn rate", `${analytics.churnRate}%`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between text-sm py-1.5 border-b border-purple-50 last:border-0"
              >
                <span className="text-gray-500">{k}</span>
                <span
                  className={`font-semibold ${k === "Churn rate" ? "text-red-500" : "text-gray-900"}`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Key metrics */}
        <Card>
          <SectionHeader title="Key Metrics" />
          <div className="mt-4 space-y-4">
            {metrics.map((m, i) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">{m.label}</span>
                  <span className="font-semibold text-gray-900">
                    {m.value}%
                  </span>
                </div>
                <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${METRIC_COLORS[i]}`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-1.5">
            {[
              ["Avg session length", "8.4 min"],
              ["Daily active users", shortNumber(analytics.activeUsers30d)],
              ["Messages per match", String(analytics.messagesPerMatch)],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between text-sm py-1.5 border-b border-purple-50 last:border-0"
              >
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
