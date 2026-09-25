import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OtpLimitMessages } from '../../src/components/dashboard/api-config/common/OtpLimitMessages'

describe('OTP limit messages', () => {
  it('loads saved messages and allows independent translations and clearing to default', () => {
    function Settings() {
      const [config, setConfig] = useState({ otpBlockedMessage: 'Réessayez demain.' })
      return <OtpLimitMessages config={config} onChange={setConfig} />
    }
    render(<Settings />)
    const cooldown = screen.getByLabelText('60-second wait message')
    const blocked = screen.getByLabelText('24-hour block message')
    expect(blocked.value).toBe('Réessayez demain.')
    fireEvent.change(cooldown, { target: { value: '{{seconds}} सेकंड रुकें।' } })
    expect(cooldown.value).toBe('{{seconds}} सेकंड रुकें।')
    expect(blocked.value).toBe('Réessayez demain.')
    fireEvent.change(blocked, { target: { value: '' } })
    expect(blocked.value).toBe('')
    expect(blocked.placeholder).toContain('{{seconds}}')
  })
})
