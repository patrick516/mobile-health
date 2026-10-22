import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import api from "../../services/api";

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email } = location.state || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  // If no email state passed, redirect to login
  if (!email) {
    navigate("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      // The axios interceptor will automatically attach the tempToken
      // from localStorage to this request.
      await api.patch("/auth/complete-password-reset", { newPassword });

      // Clean up the temp token
      localStorage.removeItem("auth_token");

      // Show the Toast
      setToast("Password updated successfully. Redirecting to login...");

      // Wait 2 seconds so the user can read the toast, then redirect
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update password. Try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/background.png')" }}
    >
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white border-l-4 border-green-500 shadow-2xl rounded-lg px-6 py-4 flex items-center gap-3">
            <CheckCircle className="text-green-500 w-6 h-6 shrink-0" />
            <p className="text-gray-800 font-medium">{toast}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <img
              src="/images/logo.png"
              alt="MobileHealth"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            MobileHealth Malawi
          </h1>
          <p className="text-teal-100 text-sm mt-1 drop-shadow-sm">
            Web Portal Security
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Set New Password
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Welcome, <strong>{email}</strong>.<br />
            Please replace your temporary password to continue.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  disabled={!!toast}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword((p) => !p)}
                  disabled={!!toast}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={!!toast}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword || !!toast}
              className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-2"
            >
              {loading && !toast
                ? "Updating..."
                : "Set New Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
