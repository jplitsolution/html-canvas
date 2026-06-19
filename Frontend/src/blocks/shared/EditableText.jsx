import { useState, useEffect, useRef } from 'react'
import useStore from '../../store/useStore'

function RichTextToolbar({ blockId, onAction }) {
  const duplicateBlock = useStore((s) => s.duplicateBlock)
  const removeBlock = useStore((s) => s.removeBlock)
  const addToast = useStore((s) => s.addToast)

  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val)
    onAction?.()
  }

  const handleLink = () => {
    const url = prompt('Enter link URL:')
    if (url) exec('createLink', url)
  }

  return (
    <div 
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-50 flex items-center gap-1.5 p-1.5 bg-[#18181b] border border-[#27272a] shadow-2xl rounded-xl backdrop-blur-md text-neutral-300 pointer-events-auto select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => exec('bold')}
        className="w-7 h-7 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-xs font-bold"
        title="Bold (Ctrl+B)"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => exec('italic')}
        className="w-7 h-7 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-xs italic font-serif"
        title="Italic (Ctrl+I)"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => exec('underline')}
        className="w-7 h-7 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-xs underline"
        title="Underline (Ctrl+U)"
      >
        U
      </button>
      <div className="divider-v" />
      <button
        type="button"
        onClick={handleLink}
        className="w-7 h-7 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-xs"
        title="Link"
      >
        🔗
      </button>
      <input 
        type="color"
        onChange={(e) => exec('foreColor', e.target.value)}
        className="w-5 h-5 rounded border border-[#27272a] bg-transparent cursor-pointer overflow-hidden p-0 shrink-0"
        title="Text Color"
      />
      <select
        onChange={(e) => exec('fontName', e.target.value)}
        className="bg-black/40 border border-[#27272a] rounded-lg px-2 py-1 text-[10px] outline-none text-neutral-300 font-semibold"
        title="Font Family"
      >
        <option value="Inter">Inter</option>
        <option value="Outfit">Outfit</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Courier New">Monospace</option>
      </select>
      <select
        onChange={(e) => exec('fontSize', e.target.value)}
        className="bg-black/40 border border-[#27272a] rounded-lg px-2 py-1 text-[10px] outline-none text-neutral-300 font-semibold"
        title="Font Size"
      >
        <option value="2">13px</option>
        <option value="3">16px</option>
        <option value="4">18px</option>
        <option value="5">24px</option>
        <option value="6">32px</option>
        <option value="7">48px</option>
      </select>
      <div className="divider-v" />
      <button
        type="button"
        onClick={() => {
          duplicateBlock(blockId)
          addToast('Block duplicated', 'success')
        }}
        className="w-7 h-7 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-xs"
        title="Duplicate Block"
      >
        📋
      </button>
      <button
        type="button"
        onClick={() => {
          removeBlock(blockId)
          addToast('Block deleted', 'info')
        }}
        className="w-7 h-7 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 rounded-lg text-xs"
        title="Delete Block"
      >
        🗑
      </button>
    </div>
  )
}

export default function EditableText({ blockId, field, value, style = {}, className = '', isTextarea = false }) {
  const updateBlock = useStore((s) => s.updateBlock)
  const layout = useStore((s) => s.layout)
  
  const block = layout.find((b) => b.id === blockId)
  const isLocked = !!block?.content?.locked

  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value || '')
  const elementRef = useRef(null)

  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  useEffect(() => {
    if (isEditing && elementRef.current) {
      const el = elementRef.current
      el.focus()
      
      try {
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      } catch (err) {
        console.error('Failed to select text range', err)
      }
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    const cleanedText = elementRef.current ? elementRef.current.innerHTML.trim() : localValue.trim()
    if (cleanedText !== (value || '').trim()) {
      updateBlock(blockId, { content: { [field]: cleanedText } }, 'textEdit')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isTextarea && !e.shiftKey) {
      e.preventDefault()
      e.target.blur()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setLocalValue(value || '')
      setIsEditing(false)
    }
  }

  if (!blockId) {
    return <span style={style} className={className} dangerouslySetInnerHTML={{ __html: value }} />
  }

  if (isEditing && !isLocked) {
    return (
      <span className="relative inline-block min-w-[30px]">
        <RichTextToolbar blockId={blockId} onAction={() => {}} />
        <span
          ref={elementRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={(e) => setLocalValue(e.currentTarget.innerHTML)}
          style={{
            ...style,
            outline: 'none',
            borderBottom: '1.5px dashed var(--accent, #6B5CE7)',
            display: 'inline-block',
            minWidth: '30px',
            cursor: 'text',
            backgroundColor: 'rgba(107, 92, 231, 0.05)',
            padding: '0 2px',
            borderRadius: '4px',
          }}
          className={`${className} inline-editing-active outline outline-2 outline-accent ring-4 ring-accent/20`}
          dangerouslySetInnerHTML={{ __html: localValue }}
        />
      </span>
    )
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (!isLocked) {
          setIsEditing(true)
        }
      }}
      style={{
        ...style,
        cursor: isLocked ? 'not-allowed' : 'text',
      }}
      className={`${className} hover:bg-white/5 rounded px-1 transition-colors duration-150`}
      title={isLocked ? 'Locked element' : 'Double click to edit inline'}
      dangerouslySetInnerHTML={{ __html: value || '<span class="opacity-40 italic">Double click to edit</span>' }}
    />
  )
}
