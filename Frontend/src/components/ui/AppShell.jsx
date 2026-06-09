import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutTemplate } from 'lucide-react'
import ThemeToggle from '../common/ThemeToggle'

const navLinks = [
  { to: '/dashboard', label: 'Projects' },
  { to: '/templates', label: 'Templates' },
]

function AppShell({ title, children, actions }) {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="shell-header-inner">
          <div className="flex items-center gap-6 min-w-0">
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
                <span className="text-sm font-medium text-fg-muted truncate">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}

export default memo(AppShell)
