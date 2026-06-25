import { memo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, FolderKanban, LayoutTemplate, Share2 } from 'lucide-react'
import { login, register } from '../services/api/auth'
import { useTheme } from '../hooks/useTheme'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/campaigns'
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputClass = isDark
    ? 'border-white/10 bg-white/5 focus:border-[#00E5FF] text-white placeholder-slate-500'
    : ''

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

  return (
    <AppShell immersive>
      <div
        className={`flex-1 w-full min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row relative overflow-hidden ${
          isDark ? 'bg-[#0B0D1A] text-white' : 'bg-bg-base text-fg'
        }`}
      >
        {/* Glow Blobs */}
        {isDark && (
          <>
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#7C4DFF]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-[#00E5FF]/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
          </>
        )}

        {/* Dotted Grid Background */}
        <div
          className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-20' : 'opacity-40'}`}
          style={{
            backgroundImage: isDark
              ? 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)'
              : 'radial-gradient(rgba(124, 77, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Floating geometric shapes */}
        {isDark && (
          <>
            <div className="absolute top-[8%] left-[8%] w-16 h-16 rounded-lg bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 border border-white/5 backdrop-blur-sm pointer-events-none hidden lg:block animate-pulse" />
            <div className="absolute bottom-[10%] left-[45%] w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 border border-white/5 backdrop-blur-sm pointer-events-none hidden lg:block animate-bounce" style={{ animationDuration: '8s' }} />
          </>
        )}

        {/* LEFT COLUMN: Hero & Features (55%) */}
        <div
          className={`flex-1 lg:w-[55%] flex flex-col justify-between p-8 sm:p-12 lg:p-20 relative z-10 ${
            isDark ? 'border-r border-white/5' : 'border-r border-border'
          }`}
        >
          <div className="flex flex-col gap-6 max-w-xl my-auto">
            {/* Pill Badge */}
            <div
              className={`inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full border backdrop-blur-md text-xs font-medium mb-2 ${
                isDark
                  ? 'border-white/10 bg-white/5 text-cyan-400'
                  : 'border-border bg-bg-elevated text-accent'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Version 2.0 Available</span>
            </div>

            {/* Headline */}
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight font-display ${isDark ? 'text-white' : 'text-fg'}`}>
              Design Faster.<br />
              <span className="bg-gradient-to-r from-[#7C4DFF] via-[#a370ff] to-[#00E5FF] bg-clip-text text-transparent">
                Work Smarter.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className={`text-base sm:text-lg leading-relaxed font-sans ${isDark ? 'text-slate-300' : 'text-fg-muted'}`}>
              Create high-converting landing pages and SaaS templates in minutes. Customize everything visually and export production-ready code instantly.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {/* Feature 1 */}
              <div
                className={`p-5 rounded-xl border backdrop-blur-md transition-all duration-300 group ${
                  isDark
                    ? 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                    : 'border-border bg-bg-elevated hover:border-border-strong hover:shadow-md'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#7C4DFF]/10 border border-[#7C4DFF]/20 text-[#7C4DFF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <FolderKanban className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-fg'}`}>Organize Projects</h3>
                <p className={`text-xs leading-normal ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>Manage templates and workspaces in a unified dashboard.</p>
              </div>

              {/* Feature 2 */}
              <div
                className={`p-5 rounded-xl border backdrop-blur-md transition-all duration-300 group ${
                  isDark
                    ? 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                    : 'border-border bg-bg-elevated hover:border-border-strong hover:shadow-md'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <LayoutTemplate className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-fg'}`}>Beautiful Templates</h3>
                <p className={`text-xs leading-normal ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>Start with premium layout patterns made by designer pros.</p>
              </div>

              {/* Feature 3 */}
              <div
                className={`p-5 rounded-xl border backdrop-blur-md transition-all duration-300 group ${
                  isDark
                    ? 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                    : 'border-border bg-bg-elevated hover:border-border-strong hover:shadow-md'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Share2 className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-fg'}`}>Export & Share</h3>
                <p className={`text-xs leading-normal ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>Export clean HTML/CSS or share fast preview links.</p>
              </div>
            </div>
          </div>

          {/* Testimonial Card */}
          <div
            className={`mt-12 p-6 rounded-xl border backdrop-blur-md max-w-lg ${
              isDark
                ? 'border-white/5 bg-white/[0.02] shadow-[0_4px_30px_rgba(0,0,0,0.2)]'
                : 'border-border bg-bg-elevated shadow-md'
            }`}
          >
            <div className="flex items-center gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-sm">★</span>
              ))}
            </div>
            <p className={`text-sm italic mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-fg-muted'}`}>
              "TemplateCraft has completely transformed our design workflow. We go from concept to landing page in a fraction of the time. The code quality is absolutely stellar."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7C4DFF] to-[#00E5FF] flex items-center justify-center font-bold text-xs text-white shadow-inner">
                SC
              </div>
              <div>
                <h4 className={`text-sm font-semibold leading-none ${isDark ? 'text-white' : 'text-fg'}`}>Sarah Chen</h4>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>Lead Product Designer, Vercel</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Centered Auth Card (45%) */}
        <div className="flex-1 lg:w-[45%] flex items-center justify-center p-6 sm:p-12 lg:p-20 relative z-10">
          <Card
            className={`w-full max-w-md p-8 rounded-2xl relative overflow-hidden ${
              isDark
                ? '!bg-[#131525]/80 border-white/10 shadow-[0_0_50px_rgba(124,77,255,0.15)] backdrop-blur-xl'
                : 'shadow-lg'
            }`}
          >
            {/* Soft inner card glow */}
            {isDark && (
              <>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00E5FF]/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#7C4DFF]/10 rounded-full blur-2xl pointer-events-none" />
              </>
            )}

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#00E5FF] text-white shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                <Lock className="w-6 h-6" />
              </div>
              <span className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isDark ? 'text-cyan-400' : 'text-accent'}`}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </span>
              <h1 className={`text-2xl sm:text-3xl font-extrabold font-display ${isDark ? 'text-white' : 'text-fg'}`}>
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </h1>
              <p className={`text-xs mt-1 max-w-xs ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>
                Save projects and templates to your account
              </p>
            </div>

            {/* Styled Auth Tabs */}
            <div
              className={`flex mb-6 p-1 rounded-lg relative z-10 ${
                isDark ? 'border-b border-white/10 bg-white/[0.02]' : 'bg-bg-subtle border border-border'
              }`}
            >
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white shadow-md'
                    : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-fg-muted hover:text-fg'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white shadow-md'
                    : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-fg-muted hover:text-fg'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {mode === 'register' && (
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-fg-muted'}`}>Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                  className={inputClass}
                />
              </div>

              {error && (
                <p className={`text-sm text-center font-medium ${isDark ? 'text-red-400' : 'text-danger'}`}>{error}</p>
              )}

              <Button 
                variant="primary" 
                className="w-full py-3 bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white font-semibold shadow-[0_0_20px_rgba(124,77,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer" 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default memo(LoginPage)
