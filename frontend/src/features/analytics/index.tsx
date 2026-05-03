import { StatCard } from "../../components/shared/StatCard";
import { Card } from "../../components/ui";
import { PageLayout } from "../../components/layout/PageLayout";
import { SectionHeader } from "../../components/shared/SectionHeader";

const METRICS = [
  {
    label: "Premium conversion",
    value: 18,
    color: "from-fuchsia-500 to-violet-500",
  },
  { label: "Identity verified", value: 64, color: "from-teal-500 to-blue-500" },
  {
    label: "Profile completion",
    value: 72,
    color: "from-amber-500 to-yellow-400",
  },
  {
    label: "Reports resolved",
    value: 96,
    color: "from-green-500 to-emerald-400",
  },
];

const CHART_MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const CHART_VALUES = [40, 48, 55, 60, 68, 76, 100];

export function AnalyticsPage() {
  return (
    <PageLayout title="Analytics" subtitle="Platform performance overview">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total Users"
          value="24,631"
          change="8.3%"
          changeUp
          accent="purple"
          icon="👥"
        />
        <StatCard
          label="Messages Sent"
          value="1.2M"
          change="14%"
          changeUp
          accent="teal"
          icon="💬"
        />
        <StatCard
          label="Premium Rate"
          value="18%"
          change="2.1%"
          changeUp
          accent="blue"
          icon="💎"
        />
        <StatCard
          label="Reports Resolved"
          value="96%"
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
            {CHART_VALUES.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className={`rounded-t-sm ${i === CHART_VALUES.length - 1 ? "bg-gradient-to-t from-fuchsia-600 to-violet-400" : "bg-purple-100"}`}
                  style={{ height: `${v}%` }}
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
              ["New signups this month", "4,891"],
              ["Active users (30d)", "18,240"],
              ["Churn rate", "2.3%"],
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
            {METRICS.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">{m.label}</span>
                  <span className="font-semibold text-gray-900">
                    {m.value}%
                  </span>
                </div>
                <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-1.5">
            {[
              ["Avg session length", "8.4 min"],
              ["Daily active users", "6,842"],
              ["Messages per match", "47"],
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
