import { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { setAuthToken } from '../utils/auth';
import PasswordInput from '../components/PasswordInput';

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

export default function LoginPage({ onLogin, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data } = await authApi.post('/auth/login', { email, password });
      setAuthToken(data.token);
      toast.success('Logged in successfully');
      onLogin();
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">Login to access the report dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pp-green/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-pp-green hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pp-green text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
