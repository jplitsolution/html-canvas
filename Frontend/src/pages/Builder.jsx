import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import useStore from '../store/useStore'
import { customCollisionDetection, isValidDropTarget } from '../utils/collision'
import { isDescendant } from '../utils/blockUtils'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useDraftRecovery } from '../hooks/useDraftRecovery'
import BuilderNavbar from '../builder/BuilderNavbar'
import Toolbox from '../builder/Toolbox'
import Canvas from '../builder/Canvas'
import PropertiesPanel from '../builder/PropertiesPanel'
import DragOverlayContent from '../builder/DragOverlayContent'
import ShortcutsModal from '../builder/ShortcutsModal'
import RecoveryDialog from '../builder/RecoveryDialog'
import BulkToolbar from '../builder/BulkToolbar'

function Builder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loadProject = useStore((s) => s.loadProject)
  const project = useStore((s) => s.project)
  const layout = useStore((s) => s.layout)
  const activeDragId = useStore((s) => s.activeDragId)
  const setActiveDragId = useStore((s) => s.setActiveDragId)
  const showShortcutsModal = useStore((s) => s.showShortcutsModal)
  const setShowShortcutsModal = useStore((s) => s.setShowShortcutsModal)
  const addBlock = useStore((s) => s.addBlock)
  const moveBlock = useStore((s) => s.moveBlock)
  const reparentBlock = useStore((s) => s.reparentBlock)
  const announce = useStore((s) => s.announce)
  const error = useStore((s) => s.error)
  const isDirty = useStore((s) => s.isDirty)

  const lastOverRef = useRef(null)

  useKeyboardShortcuts()
  useDraftRecovery()

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (error) navigate('/dashboard')
  }, [error, navigate])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = useCallback((event) => {
    lastOverRef.current = null
    setActiveDragId(event.active.id)
    announce(`Dragging ${event.active.data.current?.type || 'block'}`)
  }, [setActiveDragId, announce])

  const handleDragOver = useCallback((event) => {
    lastOverRef.current = event.over
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveDragId(null)

    const activeId = active.id
    const overId = over?.id ?? lastOverRef.current?.id
    lastOverRef.current = null

    if (typeof activeId === 'string' && activeId.startsWith('toolbox-')) {
      if (!overId || !isValidDropTarget(overId)) {
        announce('Drop cancelled — release over the canvas to add')
        return
      }

      const type = activeId.replace('toolbox-', '')
      let parentId = null
      let index = -1

      if (typeof overId === 'string' && overId.startsWith('container-')) {
        parentId = overId.replace('container-', '')
      } else if (overId !== 'canvas-root') {
        const overBlock = layout.find((b) => b.id === overId)
        if (overBlock?.type === 'container') {
          parentId = overBlock.id
        } else if (overBlock) {
          parentId = overBlock.parentId
          const siblings = parentId
            ? layout.find((b) => b.id === parentId)?.children || []
            : layout.filter((b) => !b.parentId).map((b) => b.id)
          index = siblings.indexOf(overId)
        } else {
          return
        }
      }

      addBlock(type, parentId, index >= 0 ? index : undefined)
      announce(`Dropped ${type} block`)
      return
    }

    if (!over) return
    if (activeId === overId) return

    if (typeof overId === 'string' && overId.startsWith('container-')) {
      const parentId = overId.replace('container-', '')
      if (isDescendant(layout, activeId, parentId)) {
        announce('Cannot drop container inside itself')
        return
      }
      reparentBlock(activeId, parentId, 0)
      return
    }

    if (overId === 'canvas-root') {
      reparentBlock(activeId, null, 0)
      return
    }

    const overBlock = layout.find((b) => b.id === overId)
    if (!overBlock) return
    if (overBlock.type === 'container') {
      if (isDescendant(layout, activeId, overId)) return
      reparentBlock(activeId, overId, 0)
      return
    }

    moveBlock(activeId, overId, overBlock.parentId)
    announce('Block reordered')
  }, [layout, addBlock, moveBlock, reparentBlock, setActiveDragId, announce])

  const handleDragCancel = useCallback(() => {
    lastOverRef.current = null
    setActiveDragId(null)
    announce('Drag cancelled')
  }, [setActiveDragId, announce])

  const dragOverlay = useMemo(
    () => activeDragId ? <DragOverlayContent activeId={activeDragId} layout={layout} /> : null,
    [activeDragId, layout]
  )

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-base">
        <div className="animate-pulse text-fg-muted">Loading project...</div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-screen flex flex-col overflow-hidden">
        <BuilderNavbar />
        <div className="flex flex-1 overflow-hidden">
          <Toolbox />
          <Canvas />
          <PropertiesPanel />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{dragOverlay}</DragOverlay>
      <BulkToolbar />
      <ShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
      <RecoveryDialog />
    </DndContext>
  )
}

export default memo(Builder)
