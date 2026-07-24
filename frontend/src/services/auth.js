import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const client = axios.create({ baseURL: BASE_URL })

// Attach the token where we have one (needed for /me and /password)
client.interceptors.request.use(config => {
  const token = localStorage.getItem('pp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authApi = {
  signup: (data) => client.post('/auth/signup', data),          // { name, email, password, confirmPassword }
  verifyOtp: (data) => client.post('/auth/verify-otp', data),   // { email, otp }
  resendOtp: (data) => client.post('/auth/resend-otp', data),   // { email }
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  changePassword: (data) => client.patch('/auth/password', data),
}

// Pull the readable message out of an axios error
export const apiError = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.error || err?.response?.data?.message || fallback