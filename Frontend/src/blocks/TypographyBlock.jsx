import { memo, useState, useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { useBlockStyles } from '../hooks/useBlockStyles'

function TypographyBlock({ block }) {
  const style = useBlockStyles(block)
  const updateBlock = useStore((s) => s.updateBlock)
  const editingBlockId = useStore((s) => s.editingBlockId)
  const setEditingBlockId = useStore((s) => s.setEditingBlockId)
  const newlyAddedBlockId = useStore((s) => s.newlyAddedBlockId)
  const clearNewlyAddedBlockId = useStore((s) => s.clearNewlyAddedBlockId)

  const isEditing = editingBlockId === block.id
  const [localText, setLocalText] = useState(block.content?.text || '')
  const elementRef = useRef(null)
  const debounceTimeoutRef = useRef(null)

  // Focus and place cursor when editing begins
  useEffect(() => {
    if (isEditing && elementRef.current) {
      const el = elementRef.current
      if (document.activeElement !== el) {
        el.focus()
        // Put caret at the end of the text
        try {
          const range = document.createRange()
          range.selectNodeContents(el)
          range.collapse(false)
          const sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)
        } catch (e) {
          console.warn('Failed to place caret', e)
        }
      }
    }
  }, [isEditing])

  // Auto focus block on canvas drop
  useEffect(() => {
    if (newlyAddedBlockId === block.id) {
      setEditingBlockId(block.id)
      clearNewlyAddedBlockId()
    }
  }, [newlyAddedBlockId, block.id, setEditingBlockId, clearNewlyAddedBlockId])

  // Sync state if content text is updated from undo/redo/external source
  useEffect(() => {
    if (!isEditing) {
      setLocalText(block.content?.text || '')
    }
  }, [block.content?.text, isEditing])

  const handleBlur = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    const finalVal = elementRef.current ? elementRef.current.innerHTML : localText
    updateBlock(block.id, { content: { text: finalVal } }, 'typing')
    setEditingBlockId(null)
  }

  const handleInput = (e) => {
    const newHtml = e.currentTarget.innerHTML
    setLocalText(newHtml)
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      updateBlock(block.id, { content: { text: newHtml } }, 'typing')
    }, 300)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      elementRef.current?.blur()
      setEditingBlockId(null)
    } else if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        elementRef.current?.blur()
        setEditingBlockId(null)
      } else {
        // Default behavior allows creating new line
      }
    }
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setEditingBlockId(block.id)
  }

  const isEmpty = !localText || localText === '<br>' || localText.trim() === ''

  return (
    <div
      style={{
        ...style,
        position: 'relative',
        minHeight: '1.5em',
        width: '100%',
        height: 'auto',
        boxSizing: 'border-box',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEmpty && (
        <div
          style={{
            position: 'absolute',
            top: style.paddingTop || '0px',
            left: style.paddingLeft || '0px',
            right: style.paddingRight || '0px',
            color: style.color || 'inherit',
            opacity: 0.5,
            pointerEvents: 'none',
            fontStyle: 'italic',
            textAlign: style.textAlign || 'left',
            lineHeight: style.lineHeight || '1.7',
            fontSize: style.fontSize || '16px',
            fontFamily: style.fontFamily || 'Inter',
            letterSpacing: style.letterSpacing || 'normal',
          }}
        >
          Type something...
        </div>
      )}
      <div
        ref={elementRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="typography-editable"
        style={{
          outline: 'none',
          border: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: '1.5em',
          cursor: isEditing ? 'text' : 'default',
        }}
        dangerouslySetInnerHTML={{ __html: isEditing ? localText : (block.content?.text || '') }}
      />
    </div>
  )
}

export default memo(TypographyBlock)
