import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import api from "../../services/api";

// Extract only the 9 digits that follow +265.
// Accepts: "0995049331" | "+265995049331" | "265995049331" | "995049331" | "995 049 331"
const extractSuffix = (raw: string): string => {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("265")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
};

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phoneSuffix, setPhoneSuffix] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [error, setError] = useState("");
  const [successMsg] = useState(location.state?.message || "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSuffix || !pin)
      return setError("Phone number and PIN are required.");
    if (phoneSuffix.length !== 9)
      return setError("Enter the full 9-digit mobile number after +265.");
    if (!/^[89]/.test(phoneSuffix))
      return setError("Malawi mobile numbers start with 8 or 9.");
    if (pin.length !== 4) return setError("PIN must be exactly 4 digits.");

    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", {
        phoneNumber: `+265${phoneSuffix}`,
        pin: pin.trim(),
      });
      if (res.data.mustChangePin) {
        navigate("/change-pin", { state: res.data.data });
        return;
      }
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
    <div
      className="min-h-screen relative bg-cover bg-center bg-no-repeat flex items-center justify-center px-4 py-8"
      style={{ backgroundImage: "url('/images/login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-teal-950/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-teal-950/40 via-transparent to-teal-950/60" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-3">
            <img
              src="/images/logo.png"
              alt="MobileHealth Malawi"
              className="w-11 h-11 object-contain rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            MobileHealth Malawi
          </h1>
          <p className="text-teal-200 text-sm mt-1">
            Health Portal — Staff &amp; Administration
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-5">
            Enter your phone number and PIN
          </p>

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
              {successMsg}
            </div>
          )}

          {error && (
            <div
              className={`border px-4 py-3 rounded-lg text-sm mb-4 ${
                error.includes("mobile-only")
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {error.includes("mobile-only") ? (
                <div>
                  <p className="font-semibold mb-0.5">📱 Mobile-only account</p>
                  <p>
                    CCW accounts are not allowed on the web portal. Please use
                    the <strong>MobileHealth app</strong> on your phone.
                  </p>
                </div>
              ) : (
                error
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number
              </label>

              {/* Hardcoded +265 prefix + digits-only input */}
              <div className="flex items-stretch rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20 transition-colors">
                <span className="flex items-center px-3 bg-gray-50 text-gray-500 font-mono text-sm border-r border-gray-200 select-none">
                  +265
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneSuffix}
                  onChange={(e) =>
                    setPhoneSuffix(extractSuffix(e.target.value))
                  }
                  placeholder="991234567"
                  maxLength={9}
                  autoComplete="tel-national"
                  className="flex-1 px-3 py-2.5 text-sm font-mono text-gray-900 outline-none bg-white placeholder:text-gray-300"
                />
              </div>

              {/* Live hint */}
              <p className="text-xs text-gray-400 mt-1.5">
                {phoneSuffix.length === 9 ? (
                  <>
                    Will sign in as{" "}
                    <span className="font-mono text-gray-600">
                      +265{phoneSuffix}
                    </span>
                  </>
                ) : (
                  <>Enter the 9 digits after +265 (e.g. 991234567)</>
                )}
              </p>
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
                placeholder="••••"
                maxLength={4}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !mt-5"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-teal-300 text-xs mt-6">
          MobileHealth Malawi v1.0 — Web Portal
        </p>
      </div>
    </div>
  );
}
