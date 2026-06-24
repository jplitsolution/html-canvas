import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutTemplate, Download, Trash2 } from 'lucide-react'
import { downloadProjectHtml, projectHasContent } from '../../utils/exportProject'
import IconButton from '../ui/IconButton'
import Card from '../ui/Card'

function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate()
  const hasContent = projectHasContent(project)

  const handleCardClick = useCallback(() => {
    navigate(`/builder/${project.id}`)
  }, [navigate, project.id])

  const handleExport = useCallback(
    (e) => {
      e.stopPropagation()
      downloadProjectHtml(project)
    },
    [project]
  )

  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation()
      onDelete(project)
    },
    [onDelete, project]
  )

  const formattedDate = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card interactive className="p-4 group" onClick={handleCardClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#7C4DFF] to-[#00E5FF] text-white shadow-[0_0_10px_rgba(0,229,255,0.2)]">
          <LayoutTemplate className="w-5 h-5" />
        </div>
        <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <IconButton onClick={handleExport} title="Export HTML" disabled={!hasContent}>
            <Download className="w-4 h-4" />
          </IconButton>
          <IconButton onClick={handleDelete} title="Delete project" className="!text-danger hover:!bg-danger-muted">
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
      <h3 className="font-semibold text-sm text-fg font-display mb-1 truncate">{project.title}</h3>
      <p className="text-xs text-fg-muted">
        {hasContent ? 'Has content' : 'Empty'} · Updated {formattedDate}
      </p>
    </Card>
  )
}

export default memo(ProjectCard)
