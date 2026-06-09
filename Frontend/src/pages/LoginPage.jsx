import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

function LoginPage() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 p-4 rounded-xl bg-accent-muted text-accent">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-fg font-display">Sign in</h1>
            <p className="text-sm text-fg-muted mt-2 leading-relaxed max-w-xs">
              User accounts and cloud template storage will be available when the backend is connected.
            </p>
            <div className="mt-6 w-full space-y-3">
              <Button variant="primary" className="w-full" disabled>
                Continue with account
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

export default memo(LoginPage)
