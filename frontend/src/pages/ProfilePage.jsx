import { useState } from 'react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import useStore from '../store/useStore'
import { changePassword } from '../services/api/auth'
import { Settings, Shield } from 'lucide-react'

export default function ProfilePage() {
  const { dateFormat, setDateFormat, timezone, setTimezone, addToast } = useStore()
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)

  const dateFormats = [
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-07-04)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (04/07/2026)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (07/04/2026)' },
    { value: 'DD MMM YYYY', label: 'DD MMM YYYY (04 Jul 2026)' },
  ]
  const timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [Intl.DateTimeFormat().resolvedOptions().timeZone]


  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('New passwords do not match', 'error')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      addToast('Password must be at least 6 characters long', 'error')
      return
    }

    setLoading(true)
    try {
      await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      })
      addToast('Password changed successfully', 'success')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-8 animate-fade-in">
        <h1 className="text-2xl font-semibold text-fg mb-8">Profile Settings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* General Settings */}
          <section className="bg-bg-elevated border border-border rounded-xl p-6 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded bg-accent-muted text-accent flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-medium text-fg">Preferences</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-2">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => {
                    setDateFormat(e.target.value)
                    addToast('Date format updated', 'success')
                  }}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-base text-fg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                >
                  {dateFormats.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-fg-muted mt-2">
                  This format will be used across the application for displaying timestamps.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value)
                    addToast('Timezone updated', 'success')
                  }}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-base text-fg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-fg-muted mt-2">
                  Select the timezone to display times in.
                </p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="bg-bg-elevated border border-border rounded-xl p-6 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded bg-accent-muted text-accent flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-medium text-fg">Security</h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm((s) => ({ ...s, oldPassword: e.target.value }))}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-base text-fg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-base text-fg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-base text-fg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
