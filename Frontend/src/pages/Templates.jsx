import { memo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Blocks } from 'lucide-react'
import { listTemplates } from '../services/api/templates'
import useStore from '../store/useStore'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Modal from '../components/common/Modal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

function Templates() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const createProject = useStore((s) => s.createProject)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    listTemplates()
      .then((data) => setTemplates(data.filter((t) => t.id !== 'blank')))
      .finally(() => setLoading(false))
  }, [])

  const handleUseTemplate = async (template) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setCreating(true)
    try {
      const id = await createProject(template.name, template.id, template)
      navigate(`/builder/${id}`)
    } catch {
      setCreating(false)
    }
  }

  const handleStartBlank = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setCreating(true)
    try {
      const id = await createProject('Untitled Project', 'blank')
      navigate(`/builder/${id}`)
    } catch {
      setCreating(false)
    }
  }

  return (
    <AppShell
      actions={
        <Button variant="primary" size="sm" onClick={handleStartBlank} disabled={creating}>
          <Plus className="w-4 h-4" />
          Blank Project
        </Button>
      }
    >
      <main className="page-container">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-fg font-display tracking-tight">Template Library</h1>
          <p className="text-sm text-fg-muted mt-1">
            Start from a pre-built layout or create from scratch
          </p>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted">Loading templates...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {templates.map((template) => (
              <Card key={template.id} interactive className="overflow-hidden group">
                <div className="relative aspect-video bg-bg-subtle flex items-center justify-center border-b border-border overflow-hidden">
                  {typeof template.thumbnail === 'string' && template.thumbnail.startsWith('http') ? (
                    <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl transition-transform group-hover:scale-110 duration-200">
                      {template.thumbnail || '📄'}
                    </span>
                  )}
                  <Badge variant="primary" className="absolute top-3 right-3">
                    <Blocks className="w-3 h-3" />
                    {template.html?.trim() ? 'Page' : 'Blank'}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm text-fg font-display mb-1">{template.name}</h3>
                  <p className="text-xs text-fg-muted mb-4 line-clamp-2 leading-relaxed">{template.description}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUseTemplate(template)}
                      disabled={creating}
                    >
                      Use Template
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)} aria-label="Preview template">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Modal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name}
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div className="aspect-video rounded-lg bg-bg-subtle flex items-center justify-center text-6xl border border-border overflow-hidden">
              {typeof previewTemplate.thumbnail === 'string' && previewTemplate.thumbnail.startsWith('http') ? (
                <img src={previewTemplate.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                previewTemplate.thumbnail || '📄'
              )}
            </div>
            <p className="text-sm text-fg-muted leading-relaxed">{previewTemplate.description}</p>
            <div className="flex items-center gap-2">
              <Badge variant="primary">
                <Blocks className="w-3 h-3" />
                {previewTemplate.html?.trim() ? 'Full page template' : 'Blank template'}
              </Badge>
            </div>
            <Button
              variant="primary"
              className="w-full"
              disabled={creating}
              onClick={() => { handleUseTemplate(previewTemplate); setPreviewTemplate(null) }}
            >
              Use This Template
            </Button>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

export default memo(Templates)
