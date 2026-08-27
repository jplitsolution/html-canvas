import { Calendar, RefreshCw, Store } from 'lucide-react'
import Button from '../../components/ui/Button'
import { sumPinColumns } from './flows/shared/pinApiStats'

const VENDOR_DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
]

function VendorCell({ row }) {
  return (
    <td className="col-text">
      <p className="font-medium text-fg">{row.vendorName}</p>
      {row.vendorCode ? (
        <p className="text-[11px] text-fg-muted font-mono">{row.vendorCode}</p>
      ) : null}
      {row.fireStatuses ? (
        <p className="text-[11px] text-fg-subtle mt-0.5 font-mono truncate" title={row.fireStatuses}>
          Postback: {row.fireStatuses}
        </p>
      ) : null}
    </td>
  )
}

export default function VendorStatsSection({
  flow,
  vendorRows,
  vendorStatsLoading,
  vendorPreset,
  vendorCustomRange,
  setVendorCustomRange,
  onPresetChange,
  onCustomDateApply,
  onRefresh,
  onManageVendors,
}) {
  const columns = flow.statsColumns || []
  const pinTotals = flow.pinFooter ? sumPinColumns(vendorRows) : null
  const showFooter = flow.pinFooter && vendorRows.length > 1 && pinTotals

  return (
    <div className="surface-card overflow-hidden mt-5">
      <div className="px-4 py-3 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Vendors</h2>
          <p className="text-[11px] text-fg-muted mt-0.5">{flow.vendorHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border">
            {VENDOR_DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetChange(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  vendorPreset === p.id
                    ? 'bg-accent text-accent-fg shadow-xs font-semibold'
                    : 'text-fg-muted hover:text-fg hover:bg-bg-subtle'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={vendorStatsLoading}
            title="Refresh vendor stats"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${vendorStatsLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button variant="outline" size="sm" onClick={onManageVendors}>
            <Store className="w-4 h-4" />
            Manage
          </Button>
        </div>
      </div>

      {vendorPreset === 'custom' && (
        <div className="px-4 py-2.5 bg-bg-muted/40 border-b border-border flex flex-wrap items-center gap-3 animate-fade-in">
          <Calendar className="w-4 h-4 text-accent" />
          <span className="text-xs font-medium text-fg">Custom Range:</span>
          <input
            type="date"
            value={vendorCustomRange.from}
            onChange={(e) => setVendorCustomRange((r) => ({ ...r, from: e.target.value }))}
            className="px-2.5 py-1 text-xs rounded-lg border border-border bg-bg-base text-fg focus:outline-none focus:border-accent"
          />
          <span className="text-xs text-fg-muted">to</span>
          <input
            type="date"
            value={vendorCustomRange.to}
            onChange={(e) => setVendorCustomRange((r) => ({ ...r, to: e.target.value }))}
            className="px-2.5 py-1 text-xs rounded-lg border border-border bg-bg-base text-fg focus:outline-none focus:border-accent"
          />
          <Button size="xs" variant="primary" onClick={onCustomDateApply}>
            Apply
          </Button>
        </div>
      )}
      {vendorStatsLoading && vendorRows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-fg-muted">Loading vendor stats…</p>
      ) : vendorRows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-fg-muted">
          No vendors assigned.{' '}
          <button type="button" className="text-accent hover:underline" onClick={onManageVendors}>
            Assign a vendor
          </button>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-text">Vendor</th>
                {columns.map((col) => (
                  <th key={col.key} className={`col-num ${col.tint || ''}`} title={col.hint}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendorRows.map((row) => (
                <tr key={row.vendorId} className={row.assignmentActive === false ? 'opacity-70' : ''}>
                  <VendorCell row={row} />
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`col-num ${col.tint || ''} ${col.muted ? 'text-fg-muted' : ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {showFooter ? (
              <tfoot>
                <tr className="bg-bg-subtle font-medium">
                  <td className="col-text">Total</td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`col-num ${col.tint || ''} ${col.muted ? 'text-fg-muted' : ''}`}
                    >
                      {col.footer ? col.footer(pinTotals) : null}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </div>
  )
}
