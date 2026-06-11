import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft, UserPlus } from 'lucide-react'
import { login, register } from '../services/api/auth'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'

function LoginPage() {
  const navigate = useNavigate()
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
      navigate('/dashboard')
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-5 p-4 rounded-xl bg-accent-muted text-accent">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-fg font-display">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-sm text-fg-muted mt-2 leading-relaxed max-w-xs">
              Save projects and templates to your account
            </p>
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
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg mb-1.5">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
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

          <div className="mt-4 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              <UserPlus className="w-4 h-4" />
              {mode === 'login' ? 'Create new account' : 'Already have an account? Sign in'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

export default memo(LoginPage)
