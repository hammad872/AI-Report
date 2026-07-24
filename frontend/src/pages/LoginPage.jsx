import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../services/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) return setError('Please enter your email and password.')

    setBusy(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiError(err, 'Login failed.'))
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pp-green focus:ring-1 focus:ring-pp-green'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-100 p-7">
        <h1 className="font-display font-bold text-lg text-gray-900">Welcome back</h1>
        <p className="text-xs text-gray-500 mt-1 mb-6">PeakPerformance.pk — Sports Science Platform</p>

        <div className="space-y-3">
          <input className={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input
            className={input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="w-full mt-5 py-2.5 rounded-lg bg-pp-green text-white text-sm font-medium disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-pp-green font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  )
}