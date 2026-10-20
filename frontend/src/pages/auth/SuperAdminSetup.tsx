import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function SuperAdminSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get("/auth/setup-status")
      .then((res) => {
        if (res.data.hasSuperAdmin) navigate("/login");
      })
      .catch(() => navigate("/login"));
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register-super-admin", form);
      alert("Super Admin registered. Please log in.");
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-800 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">System Setup</h2>
        <p className="text-sm text-gray-500 mb-4">
          Create the primary Super Admin account. This page will lock after
          setup.
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input w-full"
            placeholder="First Name"
            required
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <input
            className="input w-full"
            placeholder="Last Name"
            required
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          <input
            className="input w-full"
            type="email"
            placeholder="Email Address"
            required
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input w-full"
            placeholder="Phone Number (+265...)"
            required
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />
          <input
            className="input w-full"
            type="password"
            placeholder="Admin Password"
            required
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Setting up..." : "Create Super Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
