import { memo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Lock, 
  ArrowLeft, 
  UserPlus, 
  FolderKanban, 
  LayoutTemplate, 
  Share2, 
  Chrome, 
  Github
} from 'lucide-react'
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

  // Force dark styling on html/body for the login page
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    
    // Save original styles/classes
    const originalBodyStyle = body.style.cssText
    const isDark = html.classList.contains('dark')
    
    html.classList.add('dark')
    body.style.backgroundColor = '#0B0D1A'
    
    return () => {
      body.style.cssText = originalBodyStyle
      if (!isDark) {
        html.classList.remove('dark')
      }
    }
  }, [])

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
      <div className="flex-1 w-full min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row relative overflow-hidden bg-[#0B0D1A] text-white">
        {/* Glow Blobs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#7C4DFF]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-[#00E5FF]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Dotted Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Floating geometric shapes */}
        <div className="absolute top-[8%] left-[8%] w-16 h-16 rounded-lg bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 border border-white/5 backdrop-blur-sm pointer-events-none hidden lg:block animate-pulse" />
        <div className="absolute bottom-[10%] left-[45%] w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 border border-white/5 backdrop-blur-sm pointer-events-none hidden lg:block animate-bounce" style={{ animationDuration: '8s' }} />

        {/* LEFT COLUMN: Hero & Features (55%) */}
        <div className="flex-1 lg:w-[55%] flex flex-col justify-between p-8 sm:p-12 lg:p-20 relative z-10 border-r border-white/5">
          <div className="flex flex-col gap-6 max-w-xl my-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-cyan-400 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Version 2.0 Available</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white font-display">
              Design Faster.<br />
              <span className="bg-gradient-to-r from-[#7C4DFF] via-[#a370ff] to-[#00E5FF] bg-clip-text text-transparent">
                Work Smarter.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
              Create high-converting landing pages and SaaS templates in minutes. Customize everything visually and export production-ready code instantly.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {/* Feature 1 */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-[#7C4DFF]/10 border border-[#7C4DFF]/20 text-[#7C4DFF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <FolderKanban className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">Organize Projects</h3>
                <p className="text-xs text-slate-400 leading-normal">Manage templates and workspaces in a unified dashboard.</p>
              </div>

              {/* Feature 2 */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <LayoutTemplate className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">Beautiful Templates</h3>
                <p className="text-xs text-slate-400 leading-normal">Start with premium layout patterns made by designer pros.</p>
              </div>

              {/* Feature 3 */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Share2 className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">Export & Share</h3>
                <p className="text-xs text-slate-400 leading-normal">Export clean HTML/CSS or share fast preview links.</p>
              </div>
            </div>
          </div>

          {/* Testimonial Card */}
          <div className="mt-12 p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md max-w-lg shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-sm">★</span>
              ))}
            </div>
            <p className="text-sm text-slate-300 italic mb-4 leading-relaxed">
              "TemplateCraft has completely transformed our design workflow. We go from concept to landing page in a fraction of the time. The code quality is absolutely stellar."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7C4DFF] to-[#00E5FF] flex items-center justify-center font-bold text-xs text-white shadow-inner">
                SC
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white leading-none">Sarah Chen</h4>
                <span className="text-xs text-slate-400">Lead Product Designer, Vercel</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Centered Auth Card (45%) */}
        <div className="flex-1 lg:w-[45%] flex items-center justify-center p-6 sm:p-12 lg:p-20 relative z-10">
          <Card className="w-full max-w-md p-8 backdrop-blur-xl bg-[#131525]/60 border border-white/10 shadow-[0_0_50px_rgba(124,77,255,0.15)] rounded-2xl relative overflow-hidden">
            {/* Soft inner cards glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00E5FF]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#7C4DFF]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#00E5FF] text-white shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                <Lock className="w-6 h-6" />
              </div>
              <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400 mb-1">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Save projects and templates to your account
              </p>
            </div>

            {/* Styled Auth Tabs */}
            <div className="flex border-b border-white/10 mb-6 bg-white/[0.02] p-1 rounded-lg relative z-10">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
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
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="border-white/10 bg-white/5 focus:border-[#00E5FF] text-white placeholder-slate-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="border-white/10 bg-white/5 focus:border-[#00E5FF] text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                  className="border-white/10 bg-white/5 focus:border-[#00E5FF] text-white placeholder-slate-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center font-medium">{error}</p>
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

            {/* Divider */}
            <div className="relative my-6 z-10">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
                <span className="bg-[#121323] px-3 text-slate-400 rounded-full border border-white/10">Or continue with</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all duration-200 text-slate-300 hover:text-white cursor-pointer"
              >
                <Chrome className="w-4 h-4 text-red-400" />
                <span>Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all duration-200 text-slate-300 hover:text-white cursor-pointer"
              >
                <Github className="w-4 h-4 text-white" />
                <span>GitHub</span>
              </button>
            </div>

            <div className="mt-4 space-y-2 relative z-10">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="w-full py-2.5 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all duration-200 text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {mode === 'login' ? 'Create new account' : 'Already have an account? Sign in'}
              </button>
              <button 
                type="button"
                className="w-full py-2.5 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-transparent text-sm font-semibold transition-all duration-200 text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>

            {/* Terms and Privacy Footer */}
            <p className="text-center text-[10px] text-slate-500 mt-6 relative z-10 leading-normal">
              By continuing, you agree to our{' '}
              <a href="#" className="text-slate-400 hover:text-white underline transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-slate-400 hover:text-white underline transition-colors">
                Privacy Policy
              </a>.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default memo(LoginPage)
