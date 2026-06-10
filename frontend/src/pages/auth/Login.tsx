import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import api from "../../services/api";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !pin) return setError("Phone number and PIN are required.");
    if (pin.length !== 4) return setError("PIN must be exactly 4 digits.");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", {
        phoneNumber: phone.trim(),
        pin: pin.trim(),
      });
      const { token, user } = res.data.data;
      setAuth(user, token);
      navigate("/");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Login failed. Check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
            Community Health Worker Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-6">
            Enter your phone number and 4-digit PIN
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0999000001"
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                PIN
              </label>
              <input
                className="input"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN"
                maxLength={4}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-teal-400 text-xs mt-6">
          MobileHealth Malawi v1.0
        </p>
      </div>
    </div>
  );
}
