import { memo, useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import useStore from '../../store/useStore'
import { getActiveSessionDuration } from '../../utils/analytics'

function UsageSummary() {
  const projects = useStore((s) => s.projects)
  const saveCount = useStore((s) => s.saveCount || 0)
  const exportsCount = useStore((s) => s.exports || 0)
  const sessionTimeAccumulated = useStore((s) => s.sessionTime || 0)

  const [activeDuration, setActiveDuration] = useState(0)

  useEffect(() => {
    // Update active session duration every second
    const interval = setInterval(() => {
      setActiveDuration(getActiveSessionDuration())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculate total blocks across all projects dynamically by parsing their HTML content
  const totalBlocks = projects.reduce((sum, p) => {
    if (!p.html) return sum
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(p.html, 'text/html')
      return sum + doc.body.getElementsByTagName('*').length
    } catch {
      return sum
    }
  }, 0)

  const totalSessionSeconds = sessionTimeAccumulated + activeDuration
  const displaySessionTime = `${Math.round(totalSessionSeconds / 60)}m`

  const items = [
    { label: 'Projects', value: projects.length },
    { label: 'Blocks Added', value: totalBlocks },
    { label: 'Exports', value: exportsCount },
    { label: 'Saves', value: saveCount },
    { label: 'Session Time', value: displaySessionTime },
  ]

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-md bg-gradient-to-br from-[#7C4DFF] to-[#00E5FF] text-white shadow-[0_0_10px_rgba(0,229,255,0.2)]">
          <BarChart3 className="w-4 h-4" />
        </div>
        <h3 className="font-semibold font-display text-fg">Usage Summary</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={item.label} className="text-center p-3 rounded-lg bg-bg-subtle border border-border">
            <p className="text-2xl font-bold text-accent font-display">{item.value}</p>
            <p className="text-xs text-fg-muted mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(UsageSummary)
