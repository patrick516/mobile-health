import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";

export default function ChangePin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, fullName } = location.state || {};

  const [tempPin, setTempPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If no state passed, redirect to login
  if (!userId) {
    navigate("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      return setError("New PIN must be exactly 4 digits.");
    }
    if (newPin !== confirmPin) {
      return setError("PINs do not match.");
    }
    if (newPin === tempPin) {
      return setError("New PIN must be different from your temporary PIN.");
    }

    setLoading(true);
    try {
      await api.post("/auth/complete-pin-reset", {
        userId,
        tempPin,
        newPin,
      });
      navigate("/login", {
        state: {
          message: "PIN updated successfully. Please log in with your new PIN.",
        },
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update PIN. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-4">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="w-14 h-14 object-contain rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">MobileHealth Malawi</h1>
          <p className="text-teal-300 text-sm mt-1">
            Health Portal — Staff & Administration
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Set New PIN</h2>
          <p className="text-gray-500 text-sm mb-2">
            Welcome, <strong>{fullName}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Your PIN was reset by an administrator. Please set a new 4-digit PIN
            to continue.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Temporary PIN
              </label>
              <input
                className="input"
                type="password"
                maxLength={4}
                value={tempPin}
                onChange={(e) => setTempPin(e.target.value)}
                placeholder="Enter temporary PIN"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1">
                The PIN you just used to log in
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                New PIN
              </label>
              <input
                className="input"
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Choose a new 4-digit PIN"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm New PIN
              </label>
              <input
                className="input"
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repeat new PIN"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !tempPin || !newPin || !confirmPin}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Updating PIN..." : "Set New PIN & Continue"}
            </button>
          </form>
        </div>

        <p className="text-center text-teal-400 text-xs mt-6">
          MobileHealth Malawi v1.0 — Web Portal
        </p>
      </div>
    </div>
  );
}
