import { memo, useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutTemplate, LogIn, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../services/api/auth'
import ThemeToggle from '../common/ThemeToggle'
import Button from './Button'
import IconButton from './IconButton'

const navLinks = [
  { to: '/dashboard', label: 'Projects' },
  { to: '/templates', label: 'Templates' },
]

function AppShell({ title, children, actions }) {
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

  return (
    <div className="min-h-screen flex flex-col safe-top">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="shell-header-inner">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
              <div className="p-1.5 rounded-md bg-accent-muted text-accent group-hover:bg-accent group-hover:text-accent-fg transition-colors">
                <LayoutTemplate className="w-4 h-4" />
              </div>
              <span className="font-display font-semibold text-fg tracking-tight hidden sm:block">
                TemplateCraft
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map(({ to, label }) => {
                const active = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? 'bg-accent-muted text-accent'
                        : 'text-fg-muted hover:text-fg hover:bg-bg-subtle'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
            {title && title !== 'TemplateCraft' && (
              <>
                <div className="divider-v hidden sm:block" />
                <span className="text-sm font-medium text-fg-muted truncate hidden sm:block">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              {actions}
            </div>
            {isAuthenticated ? (
              <>
                {user?.name && (
                  <span className="text-xs text-fg-muted hidden lg:inline truncate max-w-[120px]">
                    {user.name}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            )}
            <ThemeToggle />
            <div className="relative md:hidden" ref={navRef}>
              <IconButton
                onClick={() => setMobileNavOpen((v) => !v)}
                aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileNavOpen}
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </IconButton>
              {mobileNavOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 py-2 bg-bg-elevated border border-border rounded-lg shadow-lg z-50 animate-fade-in">
                  {navLinks.map(({ to, label }) => {
                    const active = location.pathname === to
                    return (
                      <Link
                        key={to}
                        to={to}
                        className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                          active ? 'text-accent bg-accent-muted' : 'text-fg hover:bg-bg-subtle'
                        }`}
                      >
                        {label}
                      </Link>
                    )
                  })}
                  {actions && (
                    <div className="sm:hidden px-4 pt-2 mt-2 border-t border-border">
                      {actions}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}

export default memo(AppShell)
