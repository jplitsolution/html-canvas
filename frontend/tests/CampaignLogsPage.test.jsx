import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CampaignLogsPage from '../src/pages/CampaignLogsPage'
import * as logsApi from '../src/services/api/logs'

const { mockCampaigns, mockVendors } = vi.hoisted(() => ({
  mockCampaigns: [
    {
      id: '37',
      name: 'Wellness Orange API',
      trackingId: 'JO-OR-37',
      country: 'Jordan',
      operator: 'Orange',
      verificationMode: 'OTP_ONLY',
      flowConfig: { entryPage: 'API_EXPOSE' },
      trackings: [{ vendorId: 24 }, { vendorId: 15 }],
    },
    {
      id: '17',
      name: 'HealthPortal_OBF',
      trackingId: 'BF-OR-17',
      country: 'Burkina Faso',
      operator: 'Orange',
      verificationMode: 'ORANGE_BF',
      flowConfig: { entryPage: 'HOME' },
      trackings: [{ vendorId: 6 }],
    },
  ],
  mockVendors: [
    { id: 24, name: 'Dheeru', code: 'dh' },
    { id: 15, name: 'Mplus', code: 'mp' },
    { id: 6, name: 'Track My Ads', code: 'ke' },
  ],
}))

vi.mock('../src/components/ui/AppShell', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>
  return {
    ResponsiveContainer: Stub,
    AreaChart: Stub,
    Area: Stub,
    BarChart: Stub,
    Bar: Stub,
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    CartesianGrid: Stub,
    Legend: Stub,
  }
})

vi.mock('../src/store/useStore', () => {
  const state = {
    addToast: vi.fn(),
    campaigns: mockCampaigns,
    fetchCampaigns: vi.fn(() => Promise.resolve(mockCampaigns)),
    vendors: mockVendors,
    fetchVendors: vi.fn(() => Promise.resolve(mockVendors)),
    timezone: 'Asia/Kolkata',
    dateFormat: 'dd/MM/yyyy',
  }
  const useStore = (selector) => selector(state)
  useStore.getState = () => state
  return { default: useStore }
})

vi.mock('../src/services/api/logs', () => ({
  getLogsStatus: vi.fn(() => Promise.resolve({ enabled: false })),
  searchCampaignLogs: vi.fn(() => Promise.resolve({ items: [], total: 0, page: 1, size: 25 })),
  getCampaignLogAggregations: vi.fn(() =>
    Promise.resolve({
      byEventType: [],
      byStatus: [],
      byVendor: [],
      timeSeries: [],
      timeSeriesByEvent: [],
      funnelTotals: {},
      otpStats: {},
    }),
  ),
  searchAllCampaignLogs: vi.fn(() => Promise.resolve({ items: [], total: 0, page: 1, size: 25 })),
  getAllCampaignLogAggregations: vi.fn(() =>
    Promise.resolve({
      byEventType: [],
      byStatus: [],
      byVendor: [],
      timeSeries: [],
      timeSeriesByEvent: [],
      funnelTotals: {},
      otpStats: {},
    }),
  ),
  downloadLogsExport: vi.fn(),
}))

describe('CampaignLogsPage cascading filters', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('cascades Campaign Node -> Event Type -> Verification Status and scopes Vendors', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CampaignLogsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(logsApi.searchAllCampaignLogs).toHaveBeenCalled()
    })

    const selects = screen.getAllByRole('combobox')
    const campaignSelect = selects[0]
    const eventSelect = selects[1]
    const statusSelect = selects[2]
    const vendorSelect = selects[3]

    // Select JO-OR-37 (OTP_ONLY + API_EXPOSE)
    await user.selectOptions(campaignSelect, '37')

    await waitFor(() => {
      expect(logsApi.searchCampaignLogs).toHaveBeenCalledWith(
        '37',
        expect.objectContaining({ eventType: '', status: '', vendorId: '' }),
      )
    })

    // Event Type options should exclude WAP screen views and include API expose events
    const eventOptionValues = Array.from(eventSelect.querySelectorAll('option')).map((o) => o.value)
    expect(eventOptionValues).toContain('API_OTP_EXPOSE_SEND_IN')
    expect(eventOptionValues).toContain('OTP_VERIFY')
    expect(eventOptionValues).not.toContain('HOME_VIEW')
    expect(eventOptionValues).not.toContain('CONFIRM_VIEW')

    // Vendor dropdown should only include JO-OR-37 vendors (24, 15) and not 6
    const vendorOptionValues = Array.from(vendorSelect.querySelectorAll('option')).map((o) => o.value)
    expect(vendorOptionValues).toEqual(['', '24', '15'])

    // Select OTP_VERIFY and HELD and Dheeru (24)
    await user.selectOptions(eventSelect, 'OTP_VERIFY')
    const statusValuesForVerify = Array.from(statusSelect.querySelectorAll('option')).map((o) => o.value)
    expect(statusValuesForVerify).toEqual(['', 'OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'])

    await user.selectOptions(statusSelect, 'HELD')
    await user.selectOptions(vendorSelect, '24')

    await waitFor(() => {
      expect(logsApi.searchCampaignLogs).toHaveBeenLastCalledWith(
        '37',
        expect.objectContaining({
          eventType: 'OTP_VERIFY',
          status: 'HELD',
          vendorId: '24',
        }),
      )
    })

    // Switch to BF-OR-17 (ORANGE_BF, vendor 6 only): vendorId 24 should auto-reset to ''
    await user.selectOptions(campaignSelect, '17')

    await waitFor(() => {
      expect(vendorSelect.value).toBe('')
      expect(logsApi.searchCampaignLogs).toHaveBeenLastCalledWith(
        '17',
        expect.objectContaining({
          eventType: 'OTP_VERIFY',
          status: 'HELD',
          vendorId: '',
        }),
      )
    })

    // Switch event to SUBSCRIBE_FAILED -> HELD is invalid so status auto-resets to ''
    await user.selectOptions(eventSelect, 'SUBSCRIBE_FAILED')
    expect(statusSelect.value).toBe('')
    expect(Array.from(statusSelect.querySelectorAll('option')).map((o) => o.value)).toEqual(['', 'FAILED'])
  })
})
