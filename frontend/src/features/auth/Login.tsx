// src/features/auth/Login.tsx

import { useState } from "react";
import { useAuthStore } from "../../store/authStore";

export default function Login() {
  const { login, isLoading, error } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await login(form.email, form.password);
  };

  return (
    <div className="min-h-screen bg-[#f3f0ff] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-purple-100 overflow-hidden flex">
        {/* ── LEFT ───────────────────────────────────────── */}
        <div className="hidden md:flex w-5/12 bg-gradient-to-br from-[#1a0a35] to-[#0d0520] flex-col justify-between p-10 relative overflow-hidden">
          {/* Glows */}
          <div className="absolute top-10 left-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-0 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
              <img
                src="/images/Logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-white font-semibold">
              Anzathu<span className="text-[#E91E8C]">Connect</span>
            </span>
          </div>

          {/* Middle */}
          <div className="relative z-10 space-y-6">
            <h2 className="text-white text-3xl font-bold leading-snug">
              The admin portal
              <br />
              for <span className="text-[#E91E8C] italic">meaningful</span>
              <br />
              connections.
            </h2>
            <p className="text-white/40 text-sm leading-relaxed">
              Manage users, verify identities,
              <br />
              and keep the platform safe.
            </p>
          </div>

          {/* Stats */}
          <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-white/10 pt-6">
            {[
              { value: "24.6K", label: "Users" },
              { value: "8.2K", label: "Matches" },
              { value: "96%", label: "Resolved" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white font-bold text-lg">{s.value}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT ──────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="w-full max-w-sm">
            {/* Heading */}
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-400 text-sm mt-1 mb-8">
              Sign in to your admin account
            </p>

            {/* Error */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-500 text-sm">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@anzathuconnect.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-gray-800 placeholder-gray-300 text-sm transition"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-gray-800 placeholder-gray-300 text-sm transition pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
                  >
                    {showPassword ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !form.email || !form.password}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#E91E8C] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-purple-100 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in to portal"
                )}
              </button>
            </form>

            {/* Security note */}
            <p className="text-center text-gray-300 text-xs mt-8">
              🔒 Secured · Admin access only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
