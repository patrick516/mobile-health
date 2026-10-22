import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth.store";
import Layout from "./components/layout/Layout";
import Login from "./pages/auth/Login";
import SuperAdminSetup from "./pages/auth/SuperAdminSetup";
import Overview from "./pages/dashboard/Overview";
import HouseholdList from "./pages/households/HouseholdList";
import ReferralQueue from "./pages/referrals/ReferralQueue";
import ImmunisationTracker from "./pages/immunisations/ImmunisationTracker";
import DrugStock from "./pages/drugs/DrugStock";
import Trends from "./pages/analytics/Trends";
import DHIS2Export from "./pages/export/DHIS2Export";
import Users from "./pages/admin/Users";
import Geography from "./pages/admin/Geography";
import Facilities from "./pages/admin/Facilities";
import Reports from "./pages/reports/Reports";
import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard";
import StockReceiving from "./pages/pharmacy/StockReceiving";
import DispensingWindow from "./pages/pharmacy/DispensingWindow";
import PharmacyRequests from "./pages/pharmacy/PharmacyRequests";
import ExpiryAlerts from "./pages/pharmacy/ExpiryAlerts";
import TransactionLog from "./pages/pharmacy/TransactionLog";
import Suppliers from "./pages/pharmacy/Suppliers";
import Security from "./pages/admin/Security";
import RelocatedHouseholds from "./pages/admin/RelocatedHouseholds";
import FacilitySetup from "./pages/admin/FacilitySetup";
import ChangePassword from "./pages/auth/ChangePassword";
import SupervisorFeedback from "./pages/feedback/SupervisorFeedback";

// NEW: Import the unified Clinical Programs page
import ClinicalPrograms from "./pages/programs/ClinicalPrograms";

// Helper to check if token is expired synchronously
const isTokenExpired = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp is in seconds, Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // If malformed, treat as expired
  }
};

// Unified Route Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, clearAuth } = useAuthStore();

  // 1. No token at all
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Token is expired
  if (isTokenExpired(token)) {
    clearAuth(); // Wipe the stale session
    return <Navigate to="/login" replace />;
  }

  // 3. Force Facility Setup for Admins without a facility
  if (user?.role === "ADMIN" && !user?.facility) {
    return <Navigate to="/facility-setup" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<SuperAdminSetup />} />
        <Route path="/facility-setup" element={<FacilitySetup />} />
        <Route path="/change-password" element={<ChangePassword />} />

        {/* All protected routes go inside this guard */}
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
          <Route path="reports" element={<Reports />} />

          {/* Pharmacy Routes */}
          <Route path="pharmacy" element={<PharmacyDashboard />} />
          <Route path="pharmacy/receiving" element={<StockReceiving />} />
          <Route path="pharmacy/dispense" element={<DispensingWindow />} />
          <Route path="pharmacy/requests" element={<PharmacyRequests />} />
          <Route path="pharmacy/alerts" element={<ExpiryAlerts />} />
          <Route path="pharmacy/transactions" element={<TransactionLog />} />
          <Route path="pharmacy/suppliers" element={<Suppliers />} />

          {/* Unified Clinical Trackers (PNC, TB, FP) */}
          <Route path="programs" element={<ClinicalPrograms />} />

          <Route path="feedback" element={<SupervisorFeedback />} />

          {/* Admin Routes */}
          <Route path="admin/security" element={<Security />} />
          <Route
            path="admin/relocated-households"
            element={<RelocatedHouseholds />}
          />
          <Route path="admin/users" element={<Users />} />
          <Route path="admin/geography" element={<Geography />} />
          <Route path="admin/facilities" element={<Facilities />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
