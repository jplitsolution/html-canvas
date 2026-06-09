import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../common/Modal'
import useStore from '../../store/useStore'
import { PREBUILT_TEMPLATES } from '../../constants/templates'
import Button from '../ui/Button'
import Input from '../ui/Input'

function CreateProjectModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState('blank')
  const createProject = useStore((s) => s.createProject)
  const navigate = useNavigate()

  const handleCreate = () => {
    const id = createProject(title || 'Untitled Project', templateId)
    setTitle('')
    setTemplateId('blank')
    onClose()
    navigate(`/builder/${id}`)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project" size="lg">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Project Title</label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Website"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-2">Choose Template</label>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {PREBUILT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setTemplateId(template.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  templateId === template.id
                    ? 'border-accent bg-accent-muted'
                    : 'border-border hover:border-border-strong bg-bg-subtle'
                }`}
              >
                <div className="w-full h-16 rounded-md bg-bg-muted flex items-center justify-center text-2xl mb-2">
                  {typeof template.thumbnail === 'string' && template.thumbnail.length <= 4
                    ? template.thumbnail
                    : '📄'}
                </div>
                <p className="text-sm font-medium text-fg">{template.name}</p>
                <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate}>Create Project</Button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(CreateProjectModal)
