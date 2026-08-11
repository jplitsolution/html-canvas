import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Flag, Play } from 'lucide-react'

function StartEndNode({ data, selected }) {
  const isStart = data.kind === 'start' || data.pageType === 'START'
  const checks = data.startConfig || {}

  return (
    <div
      className={`group relative px-3 pt-3 pb-3 rounded-xl border-2 min-w-[160px] text-center shadow-sm transition-all ${
        isStart
          ? selected
            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
            : 'border-emerald-400 bg-emerald-50/80'
          : selected
            ? 'border-zinc-700 bg-zinc-100 ring-2 ring-zinc-300'
            : 'border-zinc-500 bg-zinc-50'
      }`}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-white !rounded-full"
          style={{ top: -8 }}
        />
      )}

      <div className="font-semibold text-sm text-zinc-800 flex items-center justify-center gap-1.5">
        {isStart ? (
          <Play className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Flag className="w-3.5 h-3.5 text-zinc-600" />
        )}
        {isStart ? 'START' : 'END'}
      </div>

      {isStart ? (
        <div className="mt-2 text-left space-y-0.5 px-0.5">
          <p className="text-[10px] font-medium text-emerald-800 uppercase tracking-wide">
            Before first page
          </p>
          <ul className="text-[10px] text-zinc-600 leading-snug space-y-0.5">
            <li>{checks.runHe ? '✓' : '–'} Header enrichment (HE)</li>
            <li>{checks.runBlocklist ? '✓' : '–'} Blocklist check</li>
            <li>{checks.runChecksub ? '✓' : '–'} Check subscription</li>
          </ul>
          <p className="text-[10px] text-zinc-400 mt-1">Click to configure</p>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500 mt-1.5 leading-snug">
          Funnel finished (thank you / blocked / error)
        </p>
      )}

      {isStart && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="source"
          className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white !rounded-full"
          style={{ bottom: -8 }}
        />
      )}
    </div>
  )
}

export default memo(StartEndNode)
