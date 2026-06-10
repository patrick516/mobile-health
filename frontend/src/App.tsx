import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth.store";
import Layout from "./components/layout/Layout";
import Login from "./pages/auth/Login";
import Overview from "./pages/dashboard/Overview";
import HouseholdList from "./pages/households/HouseholdList";
import ReferralQueue from "./pages/referrals/ReferralQueue";
import ImmunisationTracker from "./pages/immunisations/ImmunisationTracker";
import DrugStock from "./pages/drugs/DrugStock";
import Trends from "./pages/analytics/Trends";
import DHIS2Export from "./pages/export/DHIS2Export";
import Users from "./pages/admin/Users";
import Geography from "./pages/admin/Geography";
import Allocations from "./pages/admin/Allocations";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="households" element={<HouseholdList />} />
          <Route path="referrals" element={<ReferralQueue />} />
          <Route path="immunisations" element={<ImmunisationTracker />} />
          <Route path="drugs" element={<DrugStock />} />
          <Route path="analytics" element={<Trends />} />
          <Route path="export" element={<DHIS2Export />} />
          <Route
            path="admin/users"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
          <Route
            path="admin/geography"
            element={
              <AdminRoute>
                <Geography />
              </AdminRoute>
            }
          />
          <Route
            path="admin/allocations"
            element={
              <AdminRoute>
                <Allocations />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
