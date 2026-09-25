import React from 'react'
import Input from '../../../ui/Input'

const fields = [
  ['otpCooldownMessage', '60-second wait message', 'Please wait {{seconds}} seconds before requesting another OTP.'],
  ['otpBlockedMessage', '24-hour block message', 'OTP send limit reached. Please try again in {{seconds}} seconds.'],
  ['otpUnavailableMessage', 'Temporarily unavailable message', 'OTP sending is temporarily unavailable. Please try again later.'],
]

export function OtpLimitMessages({ config, onChange }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
      <h3 className="text-sm font-semibold text-fg">OTP limit messages</h3>
      <p className="text-xs text-fg-muted">
        Write these messages in your campaign’s language. Leave blank to use the English default.
        {' Use {{seconds}} to show the remaining wait in seconds.'}
      </p>
      {fields.map(([key, label, placeholder]) => (
        <label key={key} className="block space-y-1.5 text-sm font-medium text-fg">
          <span>{label}</span>
          <Input
            value={config[key] || ''}
            onChange={(event) => onChange({ ...config, [key]: event.target.value })}
            placeholder={placeholder}
          />
        </label>
      ))}
    </section>
  )
}
