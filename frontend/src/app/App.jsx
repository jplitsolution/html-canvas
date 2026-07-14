import { memo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GlobalErrorBoundary from '../components/common/GlobalErrorBoundary'
import ToastContainer from '../components/common/Toast'
import ScreenReaderAnnouncer from '../components/common/ScreenReaderAnnouncer'
import AuthProvider from '../context/AuthContext'
import RequireAuth from '../components/auth/RequireAuth'
import LoginPage from '../pages/LoginPage'
import CampaignsPage from '../pages/CampaignsPage'
import CampaignDetailPage from '../pages/CampaignDetailPage'
import CampaignBuilder from '../pages/CampaignBuilder'
import SubscriptionPage from '../pages/SubscriptionPage'
import CampaignLogsPage from '../pages/CampaignLogsPage'
import VendorsPage from '../pages/VendorsPage'
import FlowBuilderPage from '../pages/FlowBuilderPage'
import ProfilePage from '../pages/ProfilePage'

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
              <Route 
                path="/campaigns" 
                element={
                  <RequireAuth>
                    <CampaignsPage />
                  </RequireAuth>
                } 
              />
              <Route
                path="/analytics"
                element={
                  <RequireAuth>
                    <CampaignLogsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/vendors"
                element={
                  <RequireAuth>
                    <VendorsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/campaigns/:id"
                element={
                  <RequireAuth>
                    <CampaignDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/campaigns/:id/flow"
                element={
                  <RequireAuth>
                    <FlowBuilderPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/campaigns/:id/edit/:pageType"
                element={
                  <RequireAuth>
                    <CampaignBuilder />
                  </RequireAuth>
                }
              />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/" element={<Navigate to="/campaigns" replace />} />
              <Route path="*" element={<Navigate to="/campaigns" replace />} />
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
