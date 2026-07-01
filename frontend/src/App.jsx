import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import UploadPage from './pages/UploadPage'
import ReportPage from './pages/ReportPage'
import AdminPage from './pages/AdminPage'
import PastReports from './pages/PastReports'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { clearAuthToken, getAuthToken } from './utils/auth'

const PAGE_TITLES = {
  upload: 'New report',
  report: 'Report viewer',
  past:   'Past reports',
  admin:  'Admin panel',
}

const getResetTokenFromUrl = () => new URLSearchParams(window.location.search).get('token')

export default function App() {
  const [activePage, setActivePage] = useState('upload')
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAuthToken()))
  const [authView, setAuthView] = useState(() => (getResetTokenFromUrl() ? 'reset' : 'login'))
  const [resetToken] = useState(() => getResetTokenFromUrl())

  const handleLogout = () => {
    clearAuthToken()
    setIsAuthenticated(false)
    setAuthView('login')
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
        {authView === 'reset' && resetToken ? (
          <ResetPasswordPage
            token={resetToken}
            onBackToLogin={() => setAuthView('login')}
          />
        ) : authView === 'forgot' ? (
          <ForgotPasswordPage onBackToLogin={() => setAuthView('login')} />
        ) : (
          <LoginPage
            onLogin={() => setIsAuthenticated(true)}
            onForgotPassword={() => setAuthView('forgot')}
          />
        )}
      </>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />

      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 h-[52px] flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-medium text-gray-900">
            {PAGE_TITLES[activePage]}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activePage === 'upload' && (
            <UploadPage onReportGenerated={() => setActivePage('report')} />
          )}
          {activePage === 'report' && <ReportPage />}
          {activePage === 'past' && <PastReports onNavigate={setActivePage} />}
          {activePage === 'admin'  && <AdminPage />}
        </main>
      </div>
    </div>
  )
}