import { memo, useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, Menu, X, BarChart3, FolderKanban, Store, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../services/api/auth'
import Button from './Button'
import IconButton from './IconButton'
import BrandLogo, { PartnerBadge } from './BrandLogo'

const navLinks = [
  { to: '/campaigns', label: 'Campaigns', icon: FolderKanban },
  { to: '/vendors', label: 'Vendors', icon: Store },
  { to: '/analytics', label: 'Campaign Logs', icon: BarChart3 },
]

function AppShell({ children, actions, minimal = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen) return undefined
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMobileNavOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [mobileNavOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    window.location.reload()
  }

  if (minimal) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-base safe-top">
        <header className="border-b border-border bg-bg-elevated">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
            <Link to="/campaigns" className="flex items-center">
              <BrandLogo size="sm" />
            </Link>
            <PartnerBadge className="hidden sm:inline-flex" />
          </div>
        </header>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base safe-top">
      {/* Desktop sidebar — fixed so sign-out stays pinned bottom-left */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 flex-col w-[var(--sidebar-width)] border-r border-border bg-bg-elevated">
        <div className="h-14 flex items-center px-5 border-b border-border shrink-0">
          <Link to="/campaigns" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>
        </div>

        <div className="px-5 py-3 border-b border-border shrink-0">
          <PartnerBadge />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Main navigation">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
            return (
              <Link
                key={to}
                to={to}
                className={`sidebar-nav-link ${active ? 'sidebar-nav-link-active' : 'sidebar-nav-link-inactive'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 px-3 py-4 border-t border-border bg-bg-elevated">
          {isAuthenticated ? (
            <div className="space-y-2">
              {user?.name && (
                <p className="px-3 text-xs text-fg-muted truncate">{user.name}</p>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/profile')}>
                <User className="w-4 h-4" />
                Profile
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" className="w-full" onClick={() => navigate('/login')}>
              <LogIn className="w-4 h-4" />
              Sign in
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col min-w-0 lg:ml-[var(--sidebar-width)]">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 border-b border-border bg-bg-elevated">
          <div className="h-14 px-4 flex items-center justify-between gap-3">
            <Link to="/campaigns" className="flex items-center">
              <BrandLogo size="sm" />
            </Link>
            <div className="flex items-center gap-2">
              {actions}
              <div className="relative" ref={navRef}>
                <IconButton
                  onClick={() => setMobileNavOpen((v) => !v)}
                  aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileNavOpen}
                >
                  {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </IconButton>
                {mobileNavOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 py-2 bg-bg-elevated border border-border rounded-lg shadow-lg z-50 animate-fade-in">
                    {navLinks.map(({ to, label, icon: Icon }) => {
                      const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
                      return (
                        <Link
                          key={to}
                          to={to}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                            active ? 'text-accent bg-accent-muted' : 'text-fg hover:bg-bg-subtle'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </Link>
                      )
                    })}
                    <div className="mt-2 pt-2 border-t border-border px-4">
                      {isAuthenticated ? (
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/profile')}>
                            <User className="w-4 h-4" />
                            Profile
                          </Button>
                          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                            Sign out
                          </Button>
                        </div>
                      ) : (
                        <Button variant="primary" size="sm" className="w-full" onClick={() => navigate('/login')}>
                          <LogIn className="w-4 h-4" />
                          Sign in
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page toolbar (desktop actions) */}
        {actions && (
          <div className="hidden lg:flex items-center justify-end gap-2 px-8 py-3 border-b border-border bg-bg-elevated">
            {actions}
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

export default memo(AppShell)
