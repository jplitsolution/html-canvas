import { memo, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { login, register } from '../services/api/auth'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import BrandLogo, { PartnerBadge } from '../components/ui/BrandLogo'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const redirectTo = location.state?.from?.pathname || '/campaigns'
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await register({ email, password, name })
      }
      await login({ email, password })
      navigate(redirectTo)
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <AppShell minimal>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <p className="text-fg-muted">Loading...</p>
        </div>
      </AppShell>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <AppShell minimal>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="flex flex-col items-center text-center mb-8">
            <BrandLogo size="lg" showWordmark={false} className="mb-4" />
            <h1 className="text-2xl font-semibold text-fg">TemplateCraft</h1>
            <p className="text-sm text-fg-muted mt-1">
              Campaign management platform
            </p>
            <PartnerBadge className="mt-4" />
          </div>

          <div className="surface-card p-6">
            <div className="flex mb-6 p-0.5 rounded-md bg-bg-muted border border-border">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-bg-elevated text-fg shadow-sm'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-bg-elevated text-fg shadow-sm'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-fg mb-1.5">Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-danger text-center">{error}</p>
              )}

              <Button variant="primary" className="w-full" type="submit" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-fg-subtle mt-6">
            Manage subscription funnels by country and operator
          </p>
        </div>
      </div>
    </AppShell>
  )
}

export default memo(LoginPage)
