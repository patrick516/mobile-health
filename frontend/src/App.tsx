import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { DashboardPage } from "./features/dashboard";
import { UsersPage } from "./features/users";
import { VerificationPage } from "./features/verification";
import { ReportsPage } from "./features/reports";
import { MatchesPage } from "./features/matches";
import { SubscriptionsPage } from "./features/subscriptions";
import { LocationsPage } from "./features/locations";
import { NotificationsPage } from "./features/notifications";
import { AnalyticsPage } from "./features/analytics";
import { useUIStore } from "./store/uiStore";

const PAGES = {
  dashboard: <DashboardPage />,
  analytics: <AnalyticsPage />,
  users: <UsersPage />,
  verification: <VerificationPage />,
  reports: <ReportsPage />,
  matches: <MatchesPage />,
  subscriptions: <SubscriptionsPage />,
  locations: <LocationsPage />,
  notifications: <NotificationsPage />,
};

export default function App() {
  const { activePage } = useUIStore();

  return (
    <div className="min-h-screen bg-[#f8f5ff] flex">
      <Sidebar />
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-auto">
          {PAGES[activePage] ?? <DashboardPage />}
        </main>
      </div>
    </div>
  );
}
