import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Pencil, Trash2 } from 'lucide-react'

function PageNode({ data, selected }) {
  return (
    <div
      className={`group relative px-3 pt-3 pb-4 rounded-xl border-2 bg-blue-50 min-w-[140px] text-center shadow-sm transition-all ${
        selected ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-zinc-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-white !rounded-full"
        style={{ top: -8 }}
        title="Connection target"
      />

      <div className="font-semibold text-sm text-zinc-800 flex items-center justify-center gap-1.5">
        {data.isEntry && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500 text-white">
            Start
          </span>
        )}
        {data.label}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-2 nodrag nopan">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            data.onEdit?.()
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
          title="Edit page content"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            data.onDelete?.()
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
          title="Remove from flow"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="text-[10px] text-zinc-400 mt-1.5 leading-tight">
        Blue = start · Green = end
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white !rounded-full"
        style={{ bottom: -8 }}
        title="Connection source"
      />
    </div>
  )
}

export default memo(PageNode)
