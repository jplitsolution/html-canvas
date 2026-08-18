import { memo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GlobalErrorBoundary from '../components/common/GlobalErrorBoundary'
import ToastContainer from '../components/common/Toast'
import ScreenReaderAnnouncer from '../components/common/ScreenReaderAnnouncer'
import AuthProvider from '../context/AuthContext'
import RequireAuth from '../components/auth/RequireAuth'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import MarketsPage from '../pages/MarketsPage'
import MarketCampaignsPage from '../pages/MarketCampaignsPage'
import CampaignDetailPage from '../pages/CampaignDetailPage'
import CampaignBuilder from '../pages/CampaignBuilder'
import FlowBuilderPage from '../pages/FlowBuilderPage'
import SubscriptionPage from '../pages/SubscriptionPage'
import CampaignLogsPage from '../pages/CampaignLogsPage'
import SessionDetailPage from '../pages/SessionDetailPage'
import VendorsPage from '../pages/VendorsPage'
import CallbackDocsPage from '../pages/CallbackDocsPage'
import PostbacksPage from '../pages/PostbacksPage'
import PostbackDayLogsPage from '../pages/PostbackDayLogsPage'
import PostbackDetailPage from '../pages/PostbackDetailPage'
import ProfilePage from '../pages/ProfilePage'
import UsersPage from '../pages/UsersPage'
import RequireAdmin from '../components/auth/RequireAdmin'

function Protected({ children }) {
  return <RequireAuth>{children}</RequireAuth>
}

function AdminOnly({ children }) {
  return <RequireAdmin>{children}</RequireAdmin>
}

function App() {
  return (
    <GlobalErrorBoundary name="App">
      <AuthProvider>
        <BrowserRouter>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-fg focus:rounded-lg">
            Skip to main content
          </a>
          <main id="main-content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
              <Route path="/markets" element={<Protected><MarketsPage /></Protected>} />
              <Route
                path="/markets/:countryCode/:operatorCode"
                element={<Protected><MarketCampaignsPage /></Protected>}
              />
              <Route
                path="/markets/:countryCode/:operatorCode/campaigns/:id"
                element={<Protected><CampaignDetailPage /></Protected>}
              />
              <Route
                path="/markets/:countryCode/:operatorCode/campaigns/:id/edit/:pageType"
                element={<Protected><CampaignBuilder /></Protected>}
              />
              <Route
                path="/markets/:countryCode/:operatorCode/campaigns/:id/flow"
                element={<Protected><FlowBuilderPage /></Protected>}
              />

              {/* Legacy flat campaign URLs — still work */}
              <Route path="/campaigns" element={<Navigate to="/markets" replace />} />
              <Route path="/campaigns/:id" element={<Protected><CampaignDetailPage /></Protected>} />
              <Route path="/campaigns/:id/edit/:pageType" element={<Protected><CampaignBuilder /></Protected>} />
              <Route path="/campaigns/:id/flow" element={<Protected><FlowBuilderPage /></Protected>} />

              <Route path="/analytics" element={<Protected><CampaignLogsPage /></Protected>} />
              <Route
                path="/analytics/visits/:visitId"
                element={<Protected><SessionDetailPage /></Protected>}
              />
              <Route path="/vendors" element={<Protected><VendorsPage /></Protected>} />
              <Route path="/postbacks" element={<Protected><PostbacksPage /></Protected>} />
              <Route
                path="/postbacks/day-logs"
                element={<Protected><PostbackDayLogsPage /></Protected>}
              />
              <Route
                path="/postbacks/:postbackId"
                element={<Protected><PostbackDetailPage /></Protected>}
              />
              <Route path="/docs/callbacks" element={<Protected><CallbackDocsPage /></Protected>} />
              <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
              <Route path="/users" element={<AdminOnly><UsersPage /></AdminOnly>} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <ToastContainer />
          <ScreenReaderAnnouncer />
        </BrowserRouter>
      </AuthProvider>
    </GlobalErrorBoundary>
  )
}

export default memo(App)
