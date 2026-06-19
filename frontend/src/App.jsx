import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import UploadPage from './pages/UploadPage'
import ReportPage from './pages/ReportPage'
import AdminPage from './pages/AdminPage'
import PastReports from './pages/PastReports'

const PAGE_TITLES = {
  upload: 'New report',
  report: 'Report viewer',
  past:   'Past reports',
  admin:  'Admin panel',
}

export default function App() {
  const [activePage, setActivePage] = useState('upload')

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
            {/* Optional: Quick link to past reports */}
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