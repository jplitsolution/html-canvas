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
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 mb-8">Profile Settings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* General Settings */}
          <section className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden hover:border-gray-200/80 transition-all duration-300 h-fit">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30 mb-6">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Preferences</h2>
            </div>
            
            <div className="space-y-6 px-5 pb-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => {
                    setDateFormat(e.target.value)
                    addToast('Date format updated', 'success')
                  }}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
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
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value)
                    addToast('Timezone updated', 'success')
                  }}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
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
          <section className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden hover:border-gray-200/80 transition-all duration-300 h-fit">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30 mb-6">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Security</h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="space-y-6 px-5 pb-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm((s) => ({ ...s, oldPassword: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
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
