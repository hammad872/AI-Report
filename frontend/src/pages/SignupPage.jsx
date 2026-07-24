import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../services/auth'
import OtpInput from '../components/OtpInput'

const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none ' +
              'focus:border-pp-green focus:ring-1 focus:ring-pp-green'

export default function Signup() {
  const { requestSignupOtp, verifySignupOtp, resendSignupOtp } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('details')   // 'details' | 'verify'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Resend cooldown ticker (backend enforces 60s; this just mirrors it)
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // ── Step 1: submit details, receive a code by email ──
  const submitDetails = async () => {
    setError(''); setNotice('')

    if (!form.name.trim()) return setError('Please enter your name.')
    if (!form.email.trim()) return setError('Please enter your email.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')

    setBusy(true)
    try {
      await requestSignupOtp({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword
      })
      setStep('verify')
      setCooldown(60)
      setNotice(`We sent a 6-digit code to ${form.email.trim()}`)
    } catch (err) {
      setError(apiError(err, 'Could not send the verification code.'))
    } finally {
      setBusy(false)
    }
  }

  // ── Step 2: verify the code, account is created and we're logged in ──
  const submitOtp = async (code = otp) => {
    setError(''); setNotice('')

    if (code.length !== 6) return setError('Enter the full 6-digit code.')

    setBusy(true)
    try {
      await verifySignupOtp(form.email.trim(), code)
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiError(err, 'Verification failed.'))
      setOtp('')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(''); setNotice('')
    setBusy(true)
    try {
      await resendSignupOtp(form.email.trim())
      setCooldown(60)
      setOtp('')
      setNotice('A new code is on its way.')
    } catch (err) {
      setError(apiError(err, 'Could not resend the code.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-100 p-7">

        {step === 'details' ? (
          <>
            <h1 className="font-display font-bold text-lg text-gray-900">Create your account</h1>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              PeakPerformance.pk — Sports Science Platform
            </p>

            <div className="space-y-3">
              <input className={INPUT} placeholder="Full name"
                     value={form.name} onChange={update('name')} />
              <input className={INPUT} type="email" placeholder="Email"
                     autoComplete="email"
                     value={form.email} onChange={update('email')} />
              <input className={INPUT} type="password" placeholder="Password (min 8 characters)"
                     autoComplete="new-password"
                     value={form.password} onChange={update('password')} />
              <input className={INPUT} type="password" placeholder="Confirm password"
                     autoComplete="new-password"
                     value={form.confirmPassword} onChange={update('confirmPassword')}
                     onKeyDown={e => e.key === 'Enter' && submitDetails()} />
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

            <button onClick={submitDetails} disabled={busy}
                    className="w-full mt-5 py-2.5 rounded-lg bg-pp-green text-white text-sm font-medium disabled:opacity-60">
              {busy ? 'Sending code…' : 'Continue'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-pp-green font-medium">Log in</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display font-bold text-lg text-gray-900">Verify your email</h1>
            <p className="text-xs text-gray-500 mt-1 mb-1">
              Enter the 6-digit code we sent to
            </p>
            <p className="text-xs font-medium text-gray-800 mb-6">{form.email.trim()}</p>

            <OtpInput value={otp} onChange={setOtp} onComplete={submitOtp} disabled={busy} />

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
            {notice && !error && <p className="text-xs text-gray-500 mt-3">{notice}</p>}

            <button onClick={() => submitOtp()} disabled={busy || otp.length !== 6}
                    className="w-full mt-5 py-2.5 rounded-lg bg-pp-green text-white text-sm font-medium disabled:opacity-60">
              {busy ? 'Verifying…' : 'Verify & create account'}
            </button>

            <div className="flex items-center justify-between mt-4">
              <button onClick={() => { setStep('details'); setError(''); setNotice(''); setOtp('') }}
                      className="text-xs text-gray-500 hover:text-gray-800">
                ← Change email
              </button>
              <button onClick={resend} disabled={busy || cooldown > 0}
                      className="text-xs text-pp-green font-medium disabled:text-gray-400">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>

            <p className="text-[11px] text-gray-400 mt-5 leading-relaxed">
              The code expires in 10 minutes. Check your spam folder if it hasn't arrived.
            </p>
          </>
        )}
      </div>
    </div>
  )
}