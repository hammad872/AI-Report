import { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://ai-report-dq9t.onrender.com/api',
  timeout: 30000,
});

export default function ResetPasswordPage({ token, onBackToLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data } = await authApi.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success(data.message);
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Reset failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Set new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a new password for your account.</p>

        {done ? (
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full bg-pp-green text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-95"
          >
            Go to sign in
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pp-green/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pp-green/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pp-green text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-95 disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
